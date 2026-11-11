---
title: "身分驗證實務：驗證 Firebase token、gateway 與 refresh token"
---

**你會學到：** 怎麼在你自己的後端驗證 Firebase token、gateway 怎麼把不同的憑證轉成同一種內部 token，以及 refresh token 怎麼運作。

[身分驗證：session 與 JWT](/blog/authentication-session-vs-jwt)解釋了 token 本身。這篇介紹三種真實的安排。

## Firebase 負責登入，你自己的 API 負責資料

假設登入用 Firebase Auth，但你的資料放在自己的 API 後面。瀏覽器用 Firebase 登入，拿到一個 **ID token**，也就是由 Google 簽章的 JWT。它把這個 token 放在 header 裡送到你的 API。你的 API 必須驗證它，因為任何人都能偽造 header。

```ts
import { getAuth } from 'firebase-admin/auth'

// middleware：把「Authorization: Bearer <token>」轉成使用者，否則以 401 中止
export async function requireUser(req, res, next) {
  const header = req.headers.authorization ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!idToken) return res.status(401).json({ error: 'login required' })

  try {
    const decoded = await getAuth().verifyIdToken(idToken) // 檢查格式、到期時間和簽章
    req.user = { id: decoded.uid }
    next()
  } catch {
    res.status(401).json({ error: 'invalid or expired token' })
  }
}
```

`verifyIdToken` 確認 token 格式正確、沒有過期，而且是 Firebase 簽的。它不會檢查 token 是否已被撤銷，所以你停用的使用者在 token 到期前都還能用。如果你需要立刻切斷某人，把第二個參數設為 `true`，讓它也檢查撤銷狀態，代價是每次呼叫多一次網路查詢。從這裡開始，你的程式只用 `req.user.id`，你的資料庫永遠不需要知道 Firebase 的存在。

## 把各種憑證轉成一種的 gateway

一間公司可能有一個用 session cookie 的網頁 App、一個用 bearer token 的手機 App，以及後面的好幾個服務。讓每個服務都懂這兩種憑證會一團亂。取而代之的做法是在前面放一個 **gateway**（或 backend-for-frontend，BFF）。

![A gateway checks outside credentials and passes an internal JWT to services](diagram:mixed-credentials-gateway)

Gateway 檢查外部用戶端帶來的任何憑證，然後用一個只有 gateway 能簽發的**內部 JWT** 呼叫各服務。每個服務只驗證這個內部 token，其他一概不管。

| 部分 | 責任 | 例子 |
| --- | --- | --- |
| Gateway | 理解外部憑證，簽發內部 token | 讀取 cookie、查詢 session，簽發一個帶有 `sub` 和 `roles`、60 秒後到期的 JWT |
| 服務 | 只信任內部 token | 驗證簽章，然後讀取 `roles` |

有兩條規則能確保安全。讓內部 token 的壽命很短，因為它從來不需要撐很久；並確保除了透過 gateway 之外，網際網路無法直接連到那些服務。否則有人就能略過 gateway，送一個自己做的 token 進來。

## Refresh token

短命的 token 能限制被偷時的損害，但沒有人想每十五分鐘登入一次。答案是兩個 token。

| Token | 壽命 | 用途 | 存放位置 |
| --- | --- | --- | --- |
| Access token | 幾分鐘（Firebase ID token 大約一小時） | 每次 API 呼叫都會送出 | 記憶體，或 `HttpOnly` cookie |
| Refresh token | 幾天或幾週 | 只用來換新的 access token | `HttpOnly` cookie，或系統的安全儲存區 |

Access token 到期時，用戶端把 refresh token 送到驗證 endpoint，換一個新的 access token。Firebase 的用戶端 SDK 會在背景替你做這件事。

因為 refresh token 活得久，它比 access token 更需要小心：

- **輪替（rotation）。** 每次使用都回傳一個新的 refresh token，並讓舊的失效。
- **重用偵測。** 如果一個已經用過的 refresh token 又出現了，代表有人持有複本。撤銷整條鏈，讓使用者重新登入。
- **伺服器端紀錄。** 把 refresh token（或它們的雜湊值）存在一張表裡，這樣才能撤銷。session 與 JWT 那篇討論的撤銷清單，就放在這裡。

> [!PRINCIPLE] 核心原則
> 每個 token 都自己驗證；讓一個 gateway 把外部憑證翻譯成一種內部 token；讓活得久的那個 token 成為你能撤銷的那一個。
