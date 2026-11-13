---
title: "身分驗證：session 與 JWT"
---

**你會學到：** 伺服器記住已登入使用者的兩種方式、它們在登出或增加伺服器時各自的表現，登入 cookie 上的屬性分別在防範什麼，以及「用 Google 登入」放在哪裡。

HTTP 沒有記憶。每個請求都是單獨抵達的，伺服器無法判斷要求 `/cart` 的請求和一分鐘前登入的是同一個人。身分驗證的做法是交給瀏覽器一樣東西，讓它在每次請求時出示。這樣「東西」有兩種。

![Session and JWT login flows](diagram:session-vs-jwt-flows)

## 不透明的 token，或自帶內容的 token

**Session** 給瀏覽器一個隨機 ID，例如 `9f3a…`。這個 ID 本身沒有任何意義。使用者的資料留在伺服器端的 session store 裡，每次請求伺服器都要拿 ID 去查。

**JWT**（JSON Web Token）是一種把資料裝在自己裡面的 token：使用者 ID、到期時間，有時還有角色。伺服器用一把秘密金鑰對它簽章。每次請求時，伺服器檢查簽章，然後就信任裡面的內容，不需要查詢。

| | Session | JWT |
| --- | --- | --- |
| 使用者資料存在哪 | 伺服器上的 store（Redis、資料庫） | 瀏覽器持有的 token 裡 |
| 每次請求的工作 | 查一次 store | 驗證簽章，不用查詢 |
| 登出與撤銷 | 刪掉紀錄，使用者立刻被登出 | Token 在到期前一直有效 |
| 多台伺服器 | 每台伺服器都要連到同一個 store | 每台伺服器只需要金鑰 |
| 最強的場合 | 必須立刻把使用者踢出去，例如銀行網站或管理後台 | 很多服務或伺服器都需要檢查身分，又不想共用資料庫 |

JWT 的弱點在撤銷。被偷的 token 在到期前都能用，所以常見的做法是設很短的到期時間，再加一份撤銷清單，用在必須立刻切斷某個使用者的情況。但那份清單又是一次 store 查詢——這很能說明兩邊都不是免費的。

## Token 怎麼傳遞，是另一個選擇

大家常說「session 用 cookie，JWT 用 header」。這是習慣，不是規則。Cookie 或 `Authorization` header 都可以攜帶任何一種 token。

- **瀏覽器**會儲存 cookie 並自動送回去，所以 cookie 適合網站。
- **行動 App** 預設沒有 cookie 罐。它把 token 存在系統的安全儲存區——iOS 的 Keychain 或 Android 的 Keystore——再自己把它加進 `Authorization` header。

Token 的種類依你需要怎麼撤銷和擴展來選；傳遞方式依用戶端是什麼來選。

## Cookie 屬性在防範什麼

登入 cookie 值得被偷，所以設定時會加上三個屬性：

```http
Set-Cookie: sid=9f3a…; HttpOnly; Secure; SameSite=Lax
```

| 屬性 | 作用 | 針對的威脅 |
| --- | --- | --- |
| `HttpOnly` | JavaScript 讀不到這個 cookie。 | 跨站腳本（XSS）漏洞試圖從 `document.cookie` 複製出 session ID。 |
| `Secure` | Cookie 只會透過 HTTPS 傳送。 | 同一間咖啡廳 Wi-Fi 上的人讀取明文 HTTP 請求。 |
| `SameSite=Lax` | 大部分跨站請求都不會帶上這個 cookie。 | 別的網站在你登入期間，誘騙瀏覽器向你的網站送出表單（CSRF）。 |

## 先登入，再看權限

身分驗證（authentication）回答「你是誰？」，授權（authorisation）回答「你可以做這件事嗎？」。它們失敗時的狀態碼不同：伺服器不知道你是誰時回 401，知道你是誰但拒絕時回 403。

真實系統常常把這些零件混著用。一間商店可以只用 Firebase Auth 處理登入，再在自己的 API 裡驗證它的 token。一間公司可以設一個 gateway 檢查外部憑證，然後替後面的服務簽發內部用的 JWT。後面的文章會再回來談這兩種形式。

## 用 Google 登入：SSO 放在哪裡

Single sign-on（SSO），例如「用 Google 登入」，並不是第三種 token。它改變的是誰負責檢查密碼，而不是你的伺服器之後怎麼記住使用者。

1. 使用者按「用 Google 登入」，在 Google 那邊輸入密碼。Google 在這裡是**身分提供者**（identity provider）。你的伺服器從頭到尾都看不到密碼。
2. Google 回傳一份 **ID token**。在 OpenID Connect（OIDC）這個常見的標準裡，ID token 是一個由身分提供者簽章的 JWT。
3. 你的伺服器驗證 ID token，找出或建立這位使用者，然後發自己的 session 或 JWT，做法跟前面幾節一樣。

每次登入都會拿到一份新的 ID token。OIDC 規格要求裡面一定要有這幾個欄位：

| 欄位 | 意思 | 每次登入都一樣嗎 |
| --- | --- | --- |
| `iss` | 誰發的，例如 Google | 一樣 |
| `sub` | 這位使用者在該發行者底下的 ID，永遠不會重新指派給別人 | 一樣 |
| `aud` | 這份 token 是發給哪個網站的：你的 client ID | 一樣 |
| `exp`、`iat` | 到期時間和發出時間 | 不一樣 |

信任這份 token 之前，你的伺服器要檢查：簽章能用發行者的金鑰驗過、`iss` 是你預期的身分提供者、`aud` 包含你的 client ID、`exp` 還沒過，以及如果你在發起登入時送了 `nonce`，它要原封不動地回來。

`aud` 是最容易被漏掉的檢查。假設有個遊戲網站也提供「用 Google 登入」，而你的某位使用者在那裡登入過。遊戲網站現在手上有一份真的 ID token：Google 的簽章、Google 的 `iss`、這位使用者的 `sub`。如果你的伺服器只檢查這些，遊戲網站的站長就能把這份 token 送到你這裡，以這位使用者的身分登入。只有 `aud` 會露出破綻：上面寫的是遊戲網站，不是你。（身分提供者也可以給每個網站不同的 `sub`，叫做 pairwise identifier，但這不是你能控制的，所以還是要檢查 `aud`。）

要認出使用者，就把 `iss` 和 `sub` 一起用。規格說這兩個是唯一能當作穩定識別碼的欄位，並且規定 `email`、`name` 不能拿來當唯一識別碼。所以第一次登入時建立一筆存有 `sub` 的 user 紀錄，之後每次登入用 `iss` 加 `sub` 找回這一筆，email 只留著顯示和寄信用。寫程式時由函式庫執行這些檢查；[身分驗證實務](/blog/authentication-in-practice)就是這樣驗證 Firebase ID token 的。

## 工具：讓你不用自己做登入

自己寫登入是製造資安漏洞的經典方法。截至 2026 年 10 月，常見的選擇有：

- **Better Auth**：一個跑在你自己 App 裡、用你自己資料庫的函式庫。
- **Clerk**：一個託管服務，附有現成的登入畫面。
- **Supabase Auth** 和 **Firebase Auth**：隨各自的平台一起提供。
- **Auth.js**（前身為 NextAuth）：維護工作已移交給 Better Auth 團隊。它仍會收到安全性修補，但團隊建議新專案改用 Better Auth。

> [!PRINCIPLE] 核心原則
> Session 是不透明的 token，資料留在伺服器；JWT 是自帶內容的 token。用 cookie 還是 header 是另一個選擇，依用戶端的種類決定。
