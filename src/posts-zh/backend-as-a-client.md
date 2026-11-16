---
title: "你的後端也是一個 client"
---

**你會學到：** 為什麼後端既是 server 也是 client、往外送的請求該包哪些層、這些層在五種常見技術棧裡叫什麼，以及為什麼只在呼叫時檢查一次，會漏掉 redirect。

[後端內部](/blog/inside-a-backend)談的是請求怎麼進來：路由、middleware、handler、service、資料存取。但後端不只接請求，也會往外發請求：查資料庫、呼叫付款 API 刷卡、透過郵件服務寄信、請模型 API 產生回覆。在這些時候，你的後端就是 **client**。

這裡的 client 指的是發出請求的那一方，不一定是瀏覽器。Server 和 client 是同一次請求裡的兩個角色，同一個後端兩種角色都會扮演。

![Layers around incoming and outgoing requests](diagram:server-and-client-layers)

## 同一個後端，不同的角色

以處理 `POST /api/orders` 的商店後端為例：

| 連線 | 誰發出請求 | 你的後端的角色 |
| --- | --- | --- |
| 瀏覽器 → `/api/orders` | 瀏覽器 | Server |
| 後端 → PostgreSQL | 你的後端 | Client |
| 後端 → 付款 API | 你的後端 | Client |
| 後端 → 郵件服務 | 你的後端 | Client |

有些程式幾乎都在當 client。例如一支爬蟲：每半小時去看幾個問答網站，有新問題就請模型 API 擬一份回覆草稿，再把草稿寄給自己。它唯一收到的請求，是排程器叫它開始跑的那一次；其餘時間都是它在往外發請求。

## 往外的請求也要分層

Middleware 的作用，是把進來的請求要套用的規則集中在同一個地方，在 handler 執行前先處理掉。往外的請求也有自己的規則，同樣該集中管理。

| 項目 | 進來的請求（middleware） | 往外的請求（client 這一側的層） |
| --- | --- | --- |
| 權限 | 擋掉沒登入的呼叫者（401） | 附上 API key；擋掉程式絕對不該發出的請求 |
| 逾時 | 限制一個請求最多處理多久 | 對方一直沒回應就放棄 |
| 失敗 | 把例外轉成 500 | 收到 503 就等一下再試，或改用備援的服務商 |
| 紀錄 | 記下 method、path 和狀態碼 | 記下這次呼叫，但先把 URL 裡的密鑰拿掉 |

只有一項是單邊的：重試幾乎都發生在 client 這一側。Server 只會回應一次，要不要再送一次，是發出請求的那一方決定的。所以負責重試的一方，才需要在意 [idempotency](/blog/queues-and-workers)。

## 做法相同，名字不同

進來和往外的做法其實一樣：一層包著一層，每一層都可以在中途把請求攔下來。差別只在各家怎麼稱呼。

| 技術棧 | 進來的請求（server） | 往外的請求（client） |
| --- | --- | --- |
| Node.js | Express `app.use(fn)` | axios interceptor，或自己包一層 `fetch` 的函式 |
| Go | 包住 `http.Handler` 的函式，稱為 middleware | 包住 `http.RoundTripper` 的型別，稱為 transport |
| Spring Boot | Servlet `Filter`、`HandlerInterceptor` | `ClientHttpRequestInterceptor`（RestClient）、`ExchangeFilterFunction`（WebClient） |
| Django / Python | `MIDDLEWARE` 設定 | httpx 的 transport 或 event hook，requests 的 adapter |
| ASP.NET Core | `app.Use(...)` | 給 `HttpClient` 用的 `DelegatingHandler` |

進來的這一側，大家都叫 middleware；往外的這一側沒有統一的名稱，最常見的是 interceptor，Go 則叫 transport。

## 範例：只能讀、不能寫的 client

假設爬蟲登入用的帳號，在那個問答網站上其實也能發文，但這支程式只該讀資料。所以除了登入之外，任何會寫入的請求都要在發出去之前攔下來。在 Node 裡，可以把這條規則寫在一個函式裡，讓所有往外的請求都經過它：

```ts
async function readOnlyFetch(url: string, init: RequestInit = {}, hops = 0): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const target = new URL(url)
  const isLogin = method === 'POST' && target.pathname === '/login'
  if (method !== 'GET' && !isLogin) throw new Error(`refused: ${method} ${url}: this account is read-only`)

  // redirect 由這裡自己處理，不交給 fetch，每一次轉址才都會經過上面的檢查。
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

這個範例只接受轉到同一個網站的 redirect，轉址後一律用 `GET`。對只讀資料的程式來說，這樣就夠了。

## 為什麼 redirect 要自己處理

呼叫一次 `fetch`，實際發出的請求可能不只一個。`fetch` 預設遇到 redirect 會自動轉址（`redirect: 'follow'`），而包在外面的函式只會在第一個請求之前執行一次：

```text
fetch("https://site.example/profile")
  ├─ 請求 1：GET https://site.example/profile  → 302, Location: https://evil.example/steal
  └─ 請求 2：GET https://evil.example/steal    ← fetch 自動轉址
```

只在呼叫時檢查一次，就只看得到你傳進去的那個 URL。我在 Node 22 上用本機的測試伺服器實際跑過：包住 `fetch` 的函式只執行了一次，請求還是被轉到了另一台主機。加上 `redirect: 'manual'` 之後，Node 的 `fetch` 會直接把 302 回傳給你的程式，要不要轉址由你決定，所以第二個請求也會經過同樣的檢查。瀏覽器裡的 `fetch` 在 `manual` 模式下讀不到 `Location`，所以這種寫法只能用在 server 端。

檢查放在這裡，比在每個呼叫的地方各自檢查多了兩個好處：

- **redirect 也會被檢查。** 對方想把請求轉到別的網站時，請求在抵達那個網站之前就會被攔下，session cookie 也不會跟著送過去。
- **不會有人漏掉。** 只要程式所有往外的請求都經過 `readOnlyFetch`，以後新加的程式碼也一樣會被檢查。

重試也是同樣的道理：每重試一次，就是一個新的請求，所以重試要放在每次發出前都還會經過檢查的地方。

有些 HTTP client 本身就是這樣設計的。Go 的 `http.Client` 每發出一個請求，都會呼叫一次它的 transport（一個 `http.RoundTripper`），轉址後的請求也一樣。所以把檢查寫在 transport 裡，不必自己處理 redirect，也能看到每一個請求。

## 每一層只管一件事

不論哪種技術棧，往外的請求外面那幾層都像 middleware 一樣層層包住，每一層只針對一個請求判斷一件事：

| 層 | 負責判斷 |
| --- | --- |
| Guard（把關） | 這個請求可以發出去嗎？ |
| Retry（重試） | 這次失敗了，要不要再送一次？ |
| Proxy（代理） | 這個請求要不要改走代理伺服器？ |
| HTTP 函式庫 | 實際發出去。 |

如果某一層把一整串請求一次處理完，例如自己在裡面處理 redirect，外層就看不到中間那些請求，負責把關的那一層也攔不到它們。Server 端的 middleware 也是同樣的道理，只是方向相反：一個 Express middleware `(req, res, next)` 一次只處理一個進來的請求，所以 middleware 才能一個接一個串起來。

順序也很重要。Guard 要放在 proxy 的外層，因為 proxy 會把 URL 改成代理服務的位址，改完之後，guard 就看不出這個請求原本要送去哪個網站了。

> [!PRINCIPLE] 核心原則
> Server 和 client 是同一次請求裡的兩個角色，同一個後端兩種都會扮演。進來的請求，規則放在 middleware；往外的請求，規則放在所有請求都會經過的同一個地方，轉址後的請求也不例外。
