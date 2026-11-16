---
title: "身分驗證：session 與 JWT"
---

**你會學到：** 伺服器記住登入使用者的兩種做法、登出或伺服器變多時兩者各有什麼差別、登入 cookie 上的每個屬性在防什麼，以及「用 Google 登入」屬於哪一塊。

HTTP 不會記得之前發生過什麼。每個請求都是獨立送來的，伺服器沒辦法知道這次要 `/cart` 的人，跟一分鐘前登入的是不是同一個。身分驗證的做法，是交給瀏覽器一樣東西，讓它每次送請求時都帶著。

這樣東西不是帳號。註冊時建立的是**帳號**：資料庫裡的一筆紀錄，存著 email，如果用密碼登入，還有密碼的 hash，會一直留到帳號被刪掉為止。登入時產生的是另一樣東西：一個 session 或 token，而且會過期。每登入一次就產生一個新的，所以同時在手機和筆電登入的使用者，會有兩個。這樣東西有兩種做法。

![Session and JWT login flows](diagram:session-vs-jwt-flows)

## 不透明的 token，或自帶內容的 token

**Session** 是給瀏覽器一個隨機的 ID，例如 `9f3a…`。這個 ID 本身沒有任何意義，使用者的資料放在伺服器的 session store 裡，每次請求進來，伺服器都要拿這個 ID 去查。

**JWT**（JSON Web Token）則是把資料直接放在 token 裡：使用者 ID、過期時間，有時還有角色。伺服器會用金鑰替它簽章：可以用同一把密鑰簽章和驗證（例如 HS256），也可以用私鑰簽章、公鑰驗證（例如 Firebase 用的 RS256）。每次請求進來，伺服器只要驗證簽章，就能直接相信裡面的內容，不用再去查資料。

| | Session | JWT |
| --- | --- | --- |
| 使用者資料放在哪 | 伺服器上的 store（Redis、資料庫） | 瀏覽器拿著的 token 裡 |
| 每次請求要做的事 | 查一次 store | 驗證簽章，不用查資料 |
| 登出（使用者自己結束這次登入） | 刪掉紀錄，使用者馬上就登出了 | client 把 token 丟掉，但如果 token 被複製走，到期前還是能用 |
| 撤銷（伺服器提早終止某次登入） | 一樣，刪掉紀錄就好 | 要另外維護一份撤銷清單，每次請求都要查 |
| 好幾台伺服器 | 每台伺服器都要連到同一個 store | 每台伺服器只需要驗證簽章的金鑰 |
| 最適合 | 必須能馬上把使用者踢出去，例如銀行網站或管理後台 | 很多服務或伺服器都要確認身分，又不想共用資料庫 |

JWT 的弱點在撤銷。被偷走的 token 在過期前都能用，所以常見的做法是把有效期限設得很短，再搭配一份撤銷清單，用在必須馬上停掉某個使用者的時候。但查這份清單又變成每次都要查一次 store，可見兩種做法各有代價。

## Token 怎麼帶，是另一個選擇

常聽到「session 用 cookie，JWT 用 header」，但這只是習慣，不是規定。Cookie 和 `Authorization` header 都可以帶任何一種 token。

- **瀏覽器**會自己保存 cookie，每次請求自動帶上，所以網站適合用 cookie。
- **手機 App** 通常自己管理 token：存在安全的儲存空間裡，送請求時再自己放進 `Authorization` header。iOS 的 Keychain 可以直接存 token。Android 的 Keystore 存的是金鑰而不是資料，所以 App 會先用 Keystore 裡的金鑰把 token 加密，再把加密後的結果存起來。

要用哪一種 token，看你需要怎麼撤銷、怎麼擴充；token 怎麼帶，看 client 是什麼。

## Cookie 的屬性在防什麼

登入 cookie 被偷就等於帳號被盜用，所以設定時會加上三個屬性：

```http
Set-Cookie: sid=9f3a…; HttpOnly; Secure; SameSite=Lax
```

| 屬性 | 效果 | 防的是什麼 |
| --- | --- | --- |
| `HttpOnly` | JavaScript 讀不到這個 cookie。 | 有 XSS 漏洞時，攻擊程式從 `document.cookie` 把 session ID 偷走。 |
| `Secure` | 只透過 HTTPS 傳送。 | 在同一個咖啡廳 Wi-Fi 上的人，偷看沒加密的 HTTP 請求。 |
| `SameSite=Lax` | 大部分從別的網站發出的請求都不會帶上它。 | 你登入期間，別的網站騙你的瀏覽器向你的網站送出表單（CSRF）。 |

## 先確認身分，再看權限

身分驗證（authentication）回答「你是誰」，授權（authorization）回答「你能不能做這件事」。兩者失敗時的狀態碼不一樣：請求沒有有效的憑證時回 401，重新登入可能就好了；伺服器不管你是誰都拒絕時回 403，重新登入也沒用。

實際的系統常常把這些做法混在一起用。一間商店可以只用 Firebase Auth 處理登入，再在自己的 API 裡驗證它發的 token。一間公司可以放一個 gateway 檢查外部帶進來的憑證，再替後面的服務簽發內部用的 JWT。後面的文章會再回來談這兩種做法。

## 用 Google 登入：SSO 屬於哪一塊

Single sign-on（SSO），例如「用 Google 登入」，不是第三種 token。它改變的是「誰來檢查密碼」，不是「你的伺服器之後怎麼記住使用者」。

1. 使用者按下「用 Google 登入」，在 Google 的頁面輸入密碼。這時 Google 是 **identity provider**（身分提供者）。你的伺服器從頭到尾都看不到密碼。
2. Google 回傳一份 **ID token**。在常用的 OpenID Connect（OIDC）標準裡，ID token 是由 identity provider 簽章的 JWT。
3. 你的伺服器驗證這份 ID token，找出這個使用者（沒有的話就建立），再發自己的 session 或 JWT，做法跟前面講的一樣。

每次登入都會拿到一份新的 ID token。OIDC 規格規定裡面一定要有這幾個欄位：

| 欄位 | 意思 | 每次登入都一樣嗎 |
| --- | --- | --- |
| `iss` | 誰發的，例如 Google | 一樣 |
| `sub` | 這個使用者在發行者那邊的 ID，不會再分配給別人 | 一樣 |
| `aud` | 這份 token 是發給哪個網站的，也就是你的 client ID | 一樣 |
| `exp`、`iat` | 過期時間和發出時間 | 不一樣 |

相信這份 token 之前，你的伺服器要確認：簽章可以用發行者的金鑰驗過、`iss` 是你預期的 identity provider、`aud` 裡有你的 client ID、`exp` 還沒到；如果發起登入時你有送 `nonce`，回來的值也要一模一樣。

`aud` 是最常被漏掉的檢查。假設有一個遊戲網站也提供「用 Google 登入」，而你的某個使用者在那邊登入過。這時遊戲網站手上就有一份真的 ID token：Google 的簽章、Google 的 `iss`、這個使用者的 `sub` 都對。如果你的伺服器只檢查這幾樣，遊戲網站的站長就能把這份 token 拿來你這裡，冒用這個使用者登入。只有 `aud` 看得出問題：上面寫的是遊戲網站，不是你。（identity provider 也可以替每個網站給不同的 `sub`，叫做 pairwise identifier，但這不是你能決定的，所以 `aud` 還是要檢查。）

要辨認使用者，請用 `iss` 加 `sub`。規格說只有這兩個欄位能當作穩定的識別碼，也明確規定 `email` 和 `name` 不能拿來當唯一識別。所以第一次登入時，建立一筆存著 `sub` 的使用者資料，之後每次登入都用 `iss` 加 `sub` 找回這一筆；email 只拿來顯示和寄信。實際寫程式時，這些檢查交給函式庫做。

Firebase Auth 會再多包一層。它接手 Google 登入的結果，在你的專案裡建立使用者，再發它自己的 ID token；這份 token 的 `iss` 和 `aud` 寫的是你的 Firebase 專案，不是 Google 和你的 client ID。所以你的 API 要驗證的是 Firebase 的 token，不是 Google 的，做法請見[身分驗證實務](/blog/authentication-in-practice)。

## 工具：不用自己寫登入

自己寫登入，是最容易產生資安漏洞的事情之一。截至 2026 年 10 月，常見的選擇有：

- **Better Auth**：裝在你自己 App 裡的函式庫，資料存在你自己的資料庫。
- **Clerk**：託管服務，附現成的登入畫面。
- **Supabase Auth** 和 **Firebase Auth**：各自平台內建的登入功能。
- **Auth.js**（前身是 NextAuth）：已經交給 Better Auth 團隊維護。它還會收到安全性更新，但團隊建議新專案直接用 Better Auth。

> [!PRINCIPLE] 核心原則
> Session 是不透明的 token，資料留在伺服器；JWT 則把資料放在 token 裡。用 cookie 還是 header 是另一個選擇，看 client 是什麼來決定。
