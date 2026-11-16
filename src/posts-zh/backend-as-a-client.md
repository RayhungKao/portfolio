---
title: "你的後端也是一個用戶端"
---

**你會學到：** 為什麼每個後端既是伺服器也是用戶端、它送出的請求周圍該有哪些層、這些層在五種常見技術棧裡叫什麼，以及為什麼每次呼叫只跑一次的檢查會漏掉重新導向。

[後端內部](/blog/inside-a-backend)跟著一個請求走進來：路由、middleware、handler、service、資料存取。那只是一半的圖。同一個後端也會把請求送出去。它查詢資料庫、透過付款 API 刷卡、透過郵件服務寄信、向模型 API 要一則回覆。在這些往來裡，你的後端是**用戶端（client）**。

這裡的「用戶端」指的是送出請求的那一方，而不是瀏覽器。伺服器和用戶端是一次往來中的角色，而一個後端同時扮演兩者。

![Layers around incoming and outgoing requests](diagram:server-and-client-layers)

## 一個後端，多種角色

以一個處理 `POST /api/orders` 的商店後端為例。

| 連線 | 誰送出請求 | 你的後端扮演的角色 |
| --- | --- | --- |
| 瀏覽器 → `/api/orders` | 瀏覽器 | 伺服器 |
| 後端 → PostgreSQL | 你的後端 | 用戶端 |
| 後端 → 付款 API | 你的後端 | 用戶端 |
| 後端 → 郵件服務 | 你的後端 | 用戶端 |

有些程式幾乎全是用戶端。想像一個爬蟲，每半小時讀幾個問答網站，請模型 API 替每個新問題草擬回覆，再把草稿寄出去。它收到的唯一請求，是排程器啟動一次執行的那個 ping。其他所做的一切都是在送出請求。

## 送出的請求也有分層

Middleware 存在的目的，是讓關於進來請求的規則集中在一個地方，在任何 handler 執行之前。送出的請求也有自己的規則，基於同樣的理由，它們也該集中在一個地方。

| 關注點 | 進來（middleware） | 送出（用戶端的層） |
| --- | --- | --- |
| 誰被允許 | 拒絕沒登入的呼叫者（401） | 附上 API key；拒絕程式絕不該送出的請求 |
| 時間 | 限制一個請求最多能花多久 | 對不回應的遠端網站放棄等待 |
| 失敗 | 把例外轉成 500 | 遇到 503 暫停後重試；切換到備援供應商 |
| 紀錄 | 記錄 method、path 和狀態碼 | 記錄這次呼叫，並把 URL 裡的機密去掉 |

這張表有一處不對稱：重試幾乎完全屬於用戶端。伺服器只回應一次；決定要不要再試一次的是送出請求的那一方，這也是為什麼[idempotency](/blog/queues-and-workers)對負責重試的人很重要。

## 同樣的模式，不同的名字

兩端用的是同一種形狀：每一層包住下一層，而且可以提早中止。只是名字不同。

| 技術棧 | 進來（伺服器） | 送出（用戶端） |
| --- | --- | --- |
| Node.js | Express `app.use(fn)` | axios interceptor，或一個包住 `fetch` 的函式 |
| Go | 包住 `http.Handler` 的函式，叫做 middleware | 包住 `http.RoundTripper` 的型別，叫做 transport |
| Spring Boot | Servlet `Filter`、`HandlerInterceptor` | `ClientHttpRequestInterceptor`（RestClient）、`ExchangeFilterFunction`（WebClient） |
| Django / Python | `MIDDLEWARE` 設定 | httpx 的 transport 或 event hook，requests 的 adapter |
| ASP.NET Core | `app.Use(...)` | 給 `HttpClient` 用的 `DelegatingHandler` |

所以「middleware」是進來那一側的通用說法。送出那一側沒有單一的名詞；最常見的是「interceptor」，Go 的人則說「transport」。

## 一個範例：只能讀取的用戶端

假設爬蟲登入用的帳號也能發表回答。程式只能讀取，所以除了登入之外，所有寫入在離開機器之前都會被拒絕。在 Node 裡，這條規則放在一個函式裡，所有送出的請求都經過它：

```ts
async function readOnlyFetch(url: string, init: RequestInit = {}, hops = 0): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const target = new URL(url)
  const isLogin = method === 'POST' && target.pathname === '/login'
  if (method !== 'GET' && !isLogin) throw new Error(`refused: ${method} ${url}: this account is read-only`)

  // 重新導向在這裡自己跟隨，不交給 fetch，每一跳才都會經過上面的檢查。
  const res = await fetch(url, { ...init, redirect: 'manual' })
  const location = res.headers.get('location')
  if (res.status >= 300 && res.status < 400 && location) {
    const next = new URL(location, url)
    if (next.origin !== target.origin) throw new Error(`refused: redirect to ${next.origin}`)
    if (hops >= 5) throw new Error('refused: too many redirects')
    return readOnlyFetch(next.href, { headers: init.headers }, hops + 1)
  }
  return res
}
```

這個範例只跟隨同一個網站內的重新導向，而且一律用 `GET`，對只讀取的程式來說已經足夠。

## 為什麼檢查要自己跟隨重新導向

一次呼叫 `fetch`，可能送出不只一個請求。`fetch` 預設會自己跟隨重新導向（`redirect: 'follow'`），而包在它外面的函式只會在第一個請求之前執行一次：

```text
fetch("https://site.example/profile")
  ├─ 請求 1：GET https://site.example/profile  → 302, Location: https://evil.example/steal
  └─ 請求 2：GET https://evil.example/steal    ← fetch 自己跟過去
```

每次呼叫只跑一次的檢查，只看得到你傳進去的 URL。在 Node 22 上對本機測試伺服器實測，包住 `fetch` 的函式只執行了一次，請求卻繼續送到了第二個主機。加上 `redirect: 'manual'`，Node 的 `fetch` 會直接回傳那個 302，交給你的程式決定，下一跳就會和第一跳經過同樣的檢查。瀏覽器的 `fetch` 在 `manual` 模式下回傳的是過濾過的回應，拿不到 `Location`，所以這種寫法屬於伺服器端。

這樣放的檢查，有兩個分散在各個呼叫處的檢查所沒有的特性：

- **重新導向也會被檢查。** 導向別的網站的重新導向，會在任何請求抵達那個網站之前就被拒絕，session cookie 也就不會被送過去。
- **沒有呼叫者會忘記。** 只要程式送出的請求都經過 `readOnlyFetch`，明年新增的程式碼也會經過同樣的檢查。

重試也遵守同一條規則：每一次嘗試都是一個新的請求，所以重試要放在每次嘗試之前都還會跑到檢查的地方。

有些 HTTP 用戶端把這件事內建了。Go 的 `http.Client` 對每個請求都呼叫一次它的 transport（一個 `http.RoundTripper`），重新導向也一樣，所以放在 transport 裡的防護不必自己跟隨重新導向，就能看到每一跳。

## 一層，一個問題

不管用哪種技術棧，送出請求周圍的層都像 middleware 一樣一層套一層，每一層針對一個請求回答一個問題：

| 層 | 它的問題 |
| --- | --- |
| Guard（防護） | 這個請求到底可不可以送出？ |
| Retry（重試） | 這次嘗試失敗了，要再送一次嗎？ |
| Proxy（代理） | 這個請求要不要經過代理伺服器的位址？ |
| HTTP 函式庫 | 送出去。 |

如果某一層處理一整串請求，例如在裡面自己跟隨重新導向，那麼它外面的層就永遠看不到中間的請求，防護也就擋不住它們。伺服器的 middleware 在相反的方向遵守同樣的規則：一個 Express middleware `(req, res, next)` 處理一個進來的請求，所以 middleware 才能串接起來。

順序很重要。Guard 要放在 proxy 層外面，因為 proxy 層會把 URL 改寫成代理廠商的位址，改寫之後 guard 就分辨不出這個請求原本是要送去哪個網站了。

> [!PRINCIPLE] 核心原則
> 伺服器和用戶端是一次往來中的角色，而後端兩者都扮演。進來請求的規則放在 middleware，送出請求的規則放在每個送出的請求都會經過的那一個地方，重新導向也包括在內。
