---
title: "BaaS 平台：各自打包了什麼，規則放在哪裡"
---

**你會學到：** BaaS 是什麼、它和 PaaS 有什麼不同、六個 BaaS 平台各自打包了什麼、為什麼瀏覽器直接和資料庫溝通時規則必須放在資料庫裡，以及規則沒放好時會出什麼問題。

Backend-as-a-service（BaaS）直接給你做好的後端功能，例如資料庫、登入、檔案儲存和存取規則，所以你只需要寫很少、甚至不用寫自己的伺服器程式。PaaS 則不同：它執行的是你自己寫的伺服器（見[伺服器程式在哪裡執行](/blog/running-server-code)）。[選擇技術棧](/blog/choosing-the-stack)說要逐項能力來選。這篇替 BaaS 的選項掛上名字。平台功能變化很快，所以請把這張表當成 2026 年 10 月的狀況（已對照各產品自己的文件），在決定之前先讀一次最新的頁面。

## 六個平台

| 平台 | 是什麼 | 打包了什麼 | 什麼時候選（例子） | 你放棄什麼 |
| --- | --- | --- | --- | --- |
| Supabase | 圍繞 PostgreSQL 打造的平台 | 帶列級安全性的 Postgres、Auth、Storage、Edge Functions（跑在 Deno 上的 TypeScript）、Realtime | 你想要 SQL，也想保留離開的選項，因為核心就是一般的 Postgres。例如每個使用者只看得到自己資料列的筆記 App。 | 規則放在資料庫裡，所以你必須自己寫並測試（見下一節）。 |
| Firebase | Google 的後端平台 | Authentication、Cloud Firestore（會同步資料的 NoSQL 資料庫）、Cloud Functions | 你想要一個有用戶端快取的文件式資料庫。例如必須能離線運作的手機 App。 | Android、Apple 和網頁都支援離線持久化，但網頁預設是關閉的，必須手動開啟。 |
| Appwrite | 開源的後端平台 | Auth、Databases、Storage、Functions、Messaging、Realtime、Sites | 你想要一個也能自己架設的平台。例如必須把資料留在自家伺服器的團隊。 | 自己架設代表你要自己維運：它是以一組 Docker 服務的形式運作。 |
| Convex | 帶 TypeScript function 的響應式資料庫 | 用 TypeScript 寫的 query 和 mutation；query 會重新執行並把結果推給訂閱的用戶端 | 產品是一個持續變動資料的即時畫面，而且團隊從頭到尾都寫 TypeScript。例如共用的任務看板。 | 你用 TypeScript 而不是 SQL 查詢，所以 SQL 的工具和知識都用不上。 |
| AWS Amplify（Gen 2） | 在 AWS 上做全端 App 的工具組 | 用 repo 裡的 TypeScript 檔案定義後端：Cognito 負責驗證，AppSync 和 DynamoDB 負責資料，再加上託管 | 你已經在用 AWS，想讓後端以程式碼的形式放在前端旁邊。例如一個 repo、每位開發者各有沙盒環境。 | 你跑在 AWS 服務和它們的限制上，而且模型比較接近 DynamoDB，而不是 SQL。 |
| Neon | Serverless PostgreSQL | 有自動擴展、縮到零和分支功能的 Postgres；它的文件也列出 Auth、Realtime、Object Storage、Functions 和 Data API | 你只想要一個 Postgres 資料庫，其他自己來。例如一個 Next.js App，自己的 API 放在 serverless 主機上。 | 在把它只當資料庫用之前，先確認你要不要它更大範圍的組合。Neon 在 2025 年 5 月加入 Databricks，部分文件現在使用 Lakebase Postgres 這個名稱。 |

六個平台中有兩個位在 BaaS 這個標籤的邊緣。Neon 主要是一個託管的 Postgres 資料庫：上表中它那一列寫的就是「只想要一個 Postgres 資料庫，其他自己來」時選它。Amplify 還會替你託管前端，那一部分的運作方式像 PaaS。

[選擇技術棧](/blog/choosing-the-stack)裡的矩陣說明了為什麼 Supabase 和 Neon 出現在同一列 PostgreSQL：兩者都跑 Postgres，差別在於附帶打包了什麼。

## 為什麼規則必須放在資料庫裡

用 Supabase 這類平台時，瀏覽器直接和資料庫溝通。中間沒有你自己的 API 來檢查「這是你的筆記嗎？」，所以資料庫必須自己檢查。**列級安全性**（RLS）就是做這件事的：一條 policy 會在該表的每個查詢上加一個隱藏的條件。

| 瀏覽器送出的 | 資料庫實際執行的 |
| --- | --- |
| `select * from notes` | `select * from notes where user_id = <已登入的使用者>` |
| `update notes set title = 'x' where id = 7` | 一樣，但只在第 7 筆筆記屬於已登入使用者時才執行，而且之後那一列仍然屬於他 |

一條 policy 有兩部分。`using` 說明一個操作可以看到或修改哪些既有的列。`with check` 說明這一列之後可以長什麼樣子，讓使用者無法插入屬於別人的筆記，也無法把自己的筆記轉給別人。

## 會出什麼問題

- **沒有啟用 RLS。** 在公開 schema 裡沒有 RLS 的表，任何對它有授權的角色都能讀寫。每一張這樣的表都要啟用。
- **加上 policy 不會移除授權。** 如果 `anon` 和 `authenticated` 角色已經對某張表有權限，把它們不該有的撤銷掉。
- **匿名請求的 `auth.uid()` 是 null。** 和 null 比較永遠不會為真，所以這樣的檢查會默默失敗。Supabase 建議寫成 `auth.uid() is not null and …` 讓意圖清楚可見，並指明 policy 適用的角色（`to authenticated`）。
- **沉默代表沒有資料列。** 啟用了 RLS 卻沒有 policy 時，API 回傳的是空結果而不是錯誤。如果畫面是空的，先檢查 policy。

同樣的概念適用於任何設計：把規則放在每個呼叫者都必須經過的地方，這樣換平台時就不必重寫規則。

> [!PRINCIPLE] 核心原則
> 平台是一組能力的組合。當瀏覽器直接和資料庫溝通時，規則必須放在資料庫裡；一張沒有 policy 的表，不是空的，就是全開的。
