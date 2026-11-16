---
title: "BaaS 平台：各自包含什麼，規則放在哪裡"
---

**你會學到：** BaaS 是什麼、跟 PaaS 差在哪裡、六個 BaaS 平台各自提供哪些功能、為什麼瀏覽器直接連資料庫時，規則一定要寫在資料庫裡，以及規則沒寫好會出什麼問題。

Backend-as-a-service（BaaS）直接提供做好的後端功能，像是資料庫、登入、檔案儲存和存取規則，所以你只需要寫很少的伺服器程式，甚至完全不用寫。PaaS 則不一樣：它是幫你跑你自己寫的伺服器（見[伺服器程式在哪裡執行](/blog/running-server-code)）。[選擇技術棧](/blog/choosing-the-stack)說過要一項一項能力地選，這篇則列出 BaaS 有哪些具體的選項。這些平台的功能變得很快，下面的表是 2026 年 10 月的狀況（已對照各產品的官方文件），做決定之前，請再看一次最新的頁面。

## 六個平台

| 平台 | 是什麼 | 包含什麼 | 什麼時候選（例子） | 要付出的代價 |
| --- | --- | --- | --- | --- |
| Supabase | 以 PostgreSQL 為核心的平台 | 支援 row-level security 的 Postgres、Auth、Storage、Edge Functions（跑在 Deno 上的 TypeScript）、Realtime | 想用 SQL，也希望之後能搬走，因為核心就是一般的 Postgres。例如每個使用者只看得到自己筆記的筆記 App。 | 規則寫在資料庫裡，要自己寫、自己測（見下一節）。 |
| Firebase | Google 的後端平台 | Authentication、Cloud Firestore（會自動同步資料的 NoSQL 資料庫）、Cloud Functions | 想要一個在 client 端有快取的文件式資料庫。例如一定要能離線使用的手機 App。 | Android、Apple 和網頁都支援離線保存資料，但網頁版預設是關閉的，要自己打開。 |
| Appwrite | 開源的後端平台 | Auth、Databases、Storage、Functions、Messaging、Realtime、Sites | 想要一個也能自己架設的平台。例如資料一定要留在自家伺服器上的團隊。 | 自己架設就要自己維運：它是由一組 Docker 服務組成的。 |
| Convex | 搭配 TypeScript function 的響應式資料庫 | 用 TypeScript 寫的 query 和 mutation；資料一變，query 就會重新執行，並把結果推給有訂閱的 client | 產品的核心是一個資料不斷變動的即時畫面，而且團隊從前端到後端都寫 TypeScript。例如共用的任務看板。 | 查詢要用 TypeScript 寫，不是 SQL，所以 SQL 的工具和經驗都派不上用場。 |
| AWS Amplify（Gen 2） | 在 AWS 上做全端 App 的工具 | 在 repo 裡用 TypeScript 檔案定義後端：Cognito 負責驗證，AppSync 和 DynamoDB 負責資料，還能幫你託管網站 | 已經在用 AWS，希望後端以程式碼的形式跟前端放在一起。例如同一個 repo，每個開發者都有自己的沙盒環境。 | 要受 AWS 各服務的限制，而且資料模型比較接近 DynamoDB，不是 SQL。 |
| Neon | Serverless 的 PostgreSQL | 會自動擴充、能縮到零、支援分支的 Postgres；文件裡也列了 Auth、Realtime、Object Storage、Functions 和 Data API | 只想要一個 Postgres 資料庫，其他都自己來。例如一個 Next.js App，自己的 API 放在 serverless 主機上。 | 只把它當資料庫用之前，先想清楚其他附加功能你需不需要。Neon 在 2025 年 5 月被 Databricks 收購，部分文件現在改叫 Lakebase Postgres。 |

六個平台裡，有兩個不太算典型的 BaaS。Neon 主要是一個託管的 Postgres 資料庫：上表它那一列就寫了「只想要一個 Postgres 資料庫，其他都自己來」時才選它。Amplify 還會幫你託管前端，這部分比較像 PaaS。

[選擇技術棧](/blog/choosing-the-stack)的表格裡，Supabase 和 Neon 出現在同一列 PostgreSQL，原因就在這裡：兩者跑的都是 Postgres，差別只在附帶了哪些功能。

## 為什麼規則一定要寫在資料庫裡

用 Supabase 這類平台時，瀏覽器是直接連資料庫的。中間沒有你自己的 API 去檢查「這是不是你的筆記」，所以只能由資料庫自己檢查。**Row-level security**（RLS）就是做這件事的：一條 policy 會在這張表的每一個查詢上，偷偷加上一個條件。

| 瀏覽器送出的 | 資料庫實際執行的 |
| --- | --- |
| `select * from notes` | `select * from notes where user_id = <目前登入的使用者>` |
| `update notes set title = 'x' where id = 7` | 只有第 7 筆筆記屬於目前登入的使用者時才執行，而且改完之後，這筆筆記還是屬於他 |

一條 policy 有兩部分。`using` 決定一個操作可以看到或修改哪些已經存在的 row。`with check` 決定這個 row 改完之後可以是什麼樣子，這樣使用者就不能新增一筆屬於別人的筆記，也不能把自己的筆記改成別人的。

## 常見的問題

- **沒有開啟 RLS。** 在 public schema 裡、沒有開 RLS 的表，任何有權限的角色都能讀寫。每一張這樣的表都要開啟。
- **加了 policy，原本的權限還在。** 如果 `anon` 和 `authenticated` 角色本來就對某張表有權限，要把不該有的權限收回來。
- **沒登入時，`auth.uid()` 是 null。** 任何值跟 null 比較都不會成立，所以這種檢查會在沒有任何錯誤的情況下失效。Supabase 建議寫成 `auth.uid() is not null and …`，把意思寫清楚，同時指定這條 policy 套用在哪個角色上（`to authenticated`）。
- **沒有回傳任何資料，不代表沒問題。** 開了 RLS 卻沒寫 policy 時，API 會回傳空的結果，而不是錯誤。畫面一片空白時，先檢查 policy。

不管用哪種設計，道理都一樣：把規則放在每個呼叫者都一定會經過的地方，這樣之後換平台，就不用重寫規則。

> [!PRINCIPLE] 核心原則
> 每個平台都是一組功能的組合。瀏覽器直接連資料庫時，規則一定要寫在資料庫裡；一張沒寫 policy 的表，不是讀不到任何東西，就是誰都能讀寫。
