---
title: "你的後端也是一個用戶端"
---

**你會學到：** 為什麼每個後端既是伺服器也是用戶端、它送出的請求周圍該有哪些層、這些層在 Node、Go、Java、Python 和 .NET 裡叫什麼，以及為什麼放在 transport 裡的檢查不會被略過。

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

## 一個 Go 範例：只能讀取的用戶端

假設爬蟲登入用的帳號也能發表回答。程式只能讀取，所以除了登入之外，所有寫入在離開機器之前都會被拒絕。在 Go 裡，這條規則就是一個 transport：

```go
var ErrReadOnly = errors.New("refused: this account is read-only")

// readOnly 位在 http.Client 和網路之間。
type readOnly struct {
	next http.RoundTripper
}

func (t readOnly) RoundTrip(req *http.Request) (*http.Response, error) {
	isLogin := req.Method == http.MethodPost && req.URL.Path == "/login"
	if req.Method != http.MethodGet && !isLogin {
		return nil, fmt.Errorf("%s %s: %w", req.Method, req.URL, ErrReadOnly)
	}
	return t.next.RoundTrip(req)
}

client := &http.Client{Transport: readOnly{next: http.DefaultTransport}}
```

`http.Client` 本身從不碰網路。每個請求它都呼叫一次 `Transport.RoundTrip`，每跟隨一次重新導向就再呼叫一次。這讓 transport 擁有兩個在每個呼叫處各自檢查所沒有的特性：

- **重新導向也會被檢查。** 如果某個網站回應一個導向別的主機的重新導向，下一跳也會經過 `RoundTrip`，可以在 session cookie 跟著送出去之前就被拒絕。
- **沒有呼叫者會忘記。** 明年新增、使用同一個 client 的程式碼，也會經過同樣的檢查。

## 為什麼 transport 一次只看一個請求

Transport 給的保證是：每個請求都會經過它，而且是一個一個分別經過。沒有請求會略過它，所以把防護放在那裡是安全的。

這個保證背後的契約很小。每次呼叫 `RoundTrip` 處理一個請求：一個請求進去，一個回應或一個錯誤出來。這不是 queue。很多 goroutine 可以同時呼叫同一個 transport，而 Go 要求每個 transport 都要能安全地被這樣使用；`http.Transport` 維護一個 connection pool，讓平行的請求不必互相等待。只有當一個請求依賴另一個時，例如需要前一個回應的 `Location` 的重新導向，請求才會依序執行。

這份契約很重要，因為你程式裡的一次呼叫，在網路上可能變成好幾個請求。

```text
client.Get("https://site.example/profile")
  ├─ 請求 1：GET https://site.example/profile  → 302, Location: https://evil.example/steal
  └─ 請求 2：GET https://evil.example/steal    ← client 決定要跟隨
```

每次 `client.Get` 只跑一次的檢查，只看得到你傳進去的 URL。放在 `RoundTrip` 裡的檢查兩個請求都看得到，可以擋下第二個。重試也是一樣：每一次嘗試都是經過 transport 的獨立請求。

工作被切分開來，讓兩邊都保持簡單。Go 的文件說 `RoundTrip` 不應該處理重新導向、身分驗證或 cookie；那些屬於 `http.Client`。

| 工作 | 誰負責 |
| --- | --- |
| 要不要跟隨 302 | `http.Client` |
| 替下一個請求挑選 cookie | `http.Client` |
| 送出這一個請求並回傳它的回應 | Transport |

因為每個 transport 都接收 `*http.Request`、回傳 `*http.Response` 和 error，transport 可以一層套一層，每一層針對一個請求回答一個問題：

| 層 | 它的問題 |
| --- | --- |
| Guard（防護） | 這個請求到底可不可以送出？ |
| Retry（重試） | 這次嘗試失敗了，要再送一次嗎？ |
| Proxy（代理） | 這個請求要不要經過代理伺服器的位址？ |
| `http.DefaultTransport` | 送出去。 |

如果某一層處理一整串請求，例如自己跟隨重新導向，那麼它外面的層就永遠看不到中間的請求，防護也就擋不住它們。伺服器的 middleware 在相反的方向遵守同樣的規則：一個 Express middleware `(req, res, next)` 處理一個進來的請求，所以 middleware 才能串接起來。

層會疊起來：`readOnly{next: retry{next: proxy{next: http.DefaultTransport}}}`。順序很重要。Guard 要放在 proxy 層外面，因為 proxy 層會把 URL 改寫成代理廠商的位址，改寫之後 guard 就分辨不出這個請求原本是要送去哪個網站了。

## 哪種語言適合幾乎全是用戶端的程式

任何後端語言都能送出請求。幾乎只做這件事的程式，例如爬蟲、呼叫 API 的命令列工具、依排程抓資料的服務，常常用 Go 來寫，因為 goroutine 讓大量連線變得便宜，一個 `context` 就能把它們全部取消。這個網站上的 Go 文章會用程式碼說明這點。

> [!PRINCIPLE] 核心原則
> 伺服器和用戶端是一次往來中的角色，而後端兩者都扮演。進來請求的規則放在 middleware，送出請求的規則放在用戶端的 transport，在那裡沒有任何呼叫處能略過它們。
