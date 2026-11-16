---
title: "身分驗證實務：驗證 Firebase token、gateway 與 refresh token"
---

**你會學到：** 怎麼在自己的後端驗證 Firebase 發的 token、gateway 怎麼把不同的憑證轉成同一種內部 token，以及 refresh token 怎麼運作。

[身分驗證：session 與 JWT](/blog/authentication-session-vs-jwt)講的是 token 本身，這篇介紹三種實際的做法。

## 登入交給 Firebase，資料由自己的 API 處理

假設登入用 Firebase Auth，但資料放在你自己的 API 後面。瀏覽器透過 Firebase 登入後，會拿到一個 **ID token**，也就是由 Google 簽章的 JWT，再把它放在 header 裡送到你的 API。你的 API 一定要驗證這個 token，因為 header 誰都能偽造。

```ts
import { getAuth } from 'firebase-admin/auth'

// middleware：從「Authorization: Bearer <token>」取出使用者，取不到就回 401
export async function requireUser(req, res, next) {
  const header = req.headers.authorization ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!idToken) return res.status(401).json({ error: 'login required' })

  try {
    const decoded = await getAuth().verifyIdToken(idToken) // 檢查格式、過期時間和簽章
    req.user = { id: decoded.uid }
    next()
  } catch {
    res.status(401).json({ error: 'invalid or expired token' })
  }
}
```

`verifyIdToken` 會確認 token 格式正確、還沒過期，而且確實是 Firebase 簽的。但它不會檢查 token 有沒有被撤銷，所以你停用的使用者，在 token 過期前還是能用。如果需要立刻停掉某個人，把第二個參數設成 `true`，它就會連撤銷狀態一起檢查，代價是每次呼叫都多一次網路查詢。通過檢查之後，你的程式只要用 `req.user.id` 就好，你的資料庫完全不用知道 Firebase 的存在。

## 把各種憑證統一的 gateway

一間公司可能有一個用 session cookie 的網頁 App、一個用 bearer token 的手機 App，後面還有好幾個服務。如果每個服務都要看得懂這兩種憑證，會變得很亂。比較好的做法是在前面放一個 **gateway**（或 backend-for-frontend，BFF）。

![A gateway checks outside credentials and passes an internal JWT to services](diagram:mixed-credentials-gateway)

Gateway 負責檢查外部 client 帶來的憑證，不管是哪一種，然後用一個只有 gateway 能簽發的**內部 JWT** 去呼叫後面的服務。每個服務只要驗證這個內部 token 就好，其他都不用管。

| 角色 | 負責什麼 | 例子 |
| --- | --- | --- |
| Gateway | 看懂外部的各種憑證，簽發內部 token | 讀 cookie、查 session，簽發一個帶有 `sub` 和 `roles`、60 秒後過期的 JWT |
| 服務 | 只相信內部 token | 驗證簽章，再讀 `roles` |

要做到安全，有兩條規則。第一，內部 token 的有效期限要很短，因為它本來就不需要撐很久。第二，確保網際網路上的人只能透過 gateway 連到這些服務，沒辦法直接連。不然就有人可以繞過 gateway，送一個自己做的 token 進來。

## Refresh token

Token 的有效期限短，被偷時的損害就小，但沒有人想每十五分鐘就重新登入一次。解法是用兩個 token。

| Token | 有效期限 | 用途 | 存在哪裡 |
| --- | --- | --- | --- |
| Access token | 幾分鐘（Firebase 的 ID token 大約一小時） | 每次呼叫 API 都帶著 | 記憶體，或 `HttpOnly` cookie |
| Refresh token | 幾天到幾週 | 只用來換新的 access token | `HttpOnly` cookie，或作業系統提供的安全儲存空間 |

Access token 過期時，client 把 refresh token 送到驗證的 endpoint，換一個新的 access token。Firebase 的 client SDK 會在背景自動幫你做這件事。

Refresh token 的有效期限長，所以比 access token 更需要小心處理：

- **Rotation。** 每用一次就發一個新的 refresh token，舊的同時作廢。
- **偵測重複使用。** 如果一個已經用過的 refresh token 又出現了，代表有人拿到了複本。這時要把這一整串 token 全部撤銷，請使用者重新登入。
- **伺服器端留紀錄。** 把 refresh token（或它的 hash）存在一張表裡，才有辦法撤銷。Session 與 JWT 那篇講的撤銷清單，就是放在這裡。

> [!PRINCIPLE] 核心原則
> 每個 token 都要自己驗證；用一個 gateway 把外部的各種憑證轉成同一種內部 token；有效期限長的那個 token，一定要能撤銷。
