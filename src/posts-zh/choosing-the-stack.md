---
title: 選擇技術棧
---

**你會學到：** 怎麼一項一項能力地挑技術棧、三種常見的組合，以及三個能幫你決定選哪一種的問題。

「我該用 Supabase、Vercel，還是自己架伺服器？」這樣問，好像只有這三個選項。其實它們只是幾種常見的組合，組合裡的每一部分通常都能單獨換掉。

## 一項一項能力來選

先列出 App 需要哪些能力，再一列一列地選。

![Three packages and a mixed setup, capability by capability](diagram:capability-by-package-matrix)

先看 PostgreSQL 那一列：每一欄用的都是 PostgreSQL，差別只在於由誰來跑它：Supabase、Neon，還是你自己。最右邊混搭的那一欄，說明了這樣列表的用意：它只用 Firebase 處理登入，其他全部放在自己的 API 裡，因為每一格都可以單獨替換。

![Firebase for login only, own API for data](diagram:firebase-login-with-own-api)

## 三種組合

| 組合 | 提供什麼 | 適合 | 代價 |
| --- | --- | --- | --- |
| Backend-as-a-service（BaaS） | 登入、資料庫、檔案儲存和存取規則，全部由同一家服務商提供。 | 放在 Supabase 上的筆記 App，每個使用者只看得到自己的筆記。 | 複雜的邏輯不好寫，而且會被綁在這家廠商上。 |
| Serverless function | 有需要時才執行的一小段程式。不用自己部署伺服器。 | 一天只會被呼叫幾次的 Stripe webhook。 | 有執行時間上限、不能維持長時間的連線，還有 cold start。 |
| 完整的伺服器 | 一個一直在跑的 process，放在 VPS 或 container 平台上。 | 有很多 client 在用的外送 API，或 WebSocket 聊天。 | 維運和擴充都要自己來。 |

Backend-as-a-service 和 function 合起來，就是所謂的 **serverless**：依照 Mike Roberts 的定義，serverless 包含這兩種，可以只用其中一種，也可以兩種一起用（[martinfowler.com](https://martinfowler.com/articles/serverless.html)）。兩種都不需要你自己管伺服器。

用 BaaS 時，規則是寫在資料庫裡的。以 Supabase 為例，**row-level security**（RLS）讓你用 SQL 寫規則，就算瀏覽器直接連資料庫，資料庫也會照規則把關：

```sql
create policy "users manage their own notes" on notes
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

`to authenticated` 讓這條規則只套用在已登入的使用者；把 `auth.uid()` 包在 `select` 裡，Postgres 每個 statement 只會算一次，而不是每個 row 都算一次。這兩點都是照 Supabase 官方範例的寫法。

## Serverless 實際上是什麼樣子

Serverless function 有五個特性值得知道：

- **可以縮到零。** 沒有流量時什麼都不跑，也不收費。
- **不保留狀態。** 兩次呼叫可能跑在不同的機器上，所以不能靠記憶體在兩次呼叫之間記住任何東西。
- **Cold start。** 閒置一段時間後的第一次呼叫會比較慢。
- **有時間上限。** 每次呼叫都有最長的執行時間，跑很久的工作放不進去。
- **Connection pool。** 大量短暫執行的 function 可能把資料庫的連線數用光，所以要透過 pooler 連資料庫。

Function 能維持的連線也有時間上限（Vercel Functions 的 WebSocket 會在 300 到 800 秒後斷開），所以要開好幾個小時的聊天室，serverless 通常會搭配託管的即時服務：Supabase Realtime、Ably、Pusher，或 Cloudflare Durable Objects。從定期 polling 的頁面到完整的 WebSocket 伺服器，中間還有很多選擇，[Realtime updates](/blog/realtime-updates) 會一一介紹。

## Function 的檔案放在哪裡

每個平台對程式碼要放哪裡都有自己的規定。

| 平台 | Function 放在哪裡 |
| --- | --- |
| Next.js App Router | `app/api/.../route.ts`（Pages Router 則是 `pages/api/`） |
| Vercel，不用 Next.js | `api/` |
| Netlify | `netlify/functions/` |
| AWS Lambda | 用 SAM、SST 或 CDK 定義，再透過 API Gateway 或 Function URL 對外提供 |
| Cloudflare Workers | 一個匯出 `fetch` 的檔案，用 Wrangler 部署 |
| Supabase | `supabase/functions/<name>/index.ts` |
| Firebase | `functions/` |

## 三個問題

1. **App 只需要存取資料，再加上權限控管嗎？** 選 BaaS。規則用 RLS 就能處理，你要寫的後端程式很少；需要一點自訂邏輯時，可以交給 Supabase 的 Edge Functions 或 Cloud Functions for Firebase（Google）。
2. **有自訂的邏輯，但規模小、執行時間短，而且是由事件觸發的嗎？** 選 serverless function。Webhook、處理表單送出、呼叫需要 secret key 的 API、縮放圖片，都很適合。
3. **需要長時間的連線、跑很久的工作、大量運算，或有很多 client 要共用同一套規則嗎？** 選完整的伺服器。至於要自己管 VPS 還是用 managed runtime、要用大型雲端還是獨立的服務商，請見[伺服器程式在哪裡執行](/blog/running-server-code)裡的決策流程。

很多人說，第一個全端專案用 Supabase 是合理的預設。截至 2026 年 10 月，這是很常見的看法，但不是量測出來的結論，而且只有在你的需求符合第 1 題時才成立。不符合的話，可以照上面的表格自己混搭。

> [!NOTE] 其他相關內容
> 六個平台各包含哪些功能的比較，以及 row-level security 怎麼運作，請見 [BaaS 平台](/blog/baas-platforms)。VPS、container 和 PaaS 各是什麼、怎麼選，請見[伺服器程式在哪裡執行](/blog/running-server-code)；成本怎麼算，請見[什麼時候選 VPS 划算](/blog/when-a-vps-pays-off)。

> [!PRINCIPLE] 核心原則
> 要一項一項能力地選。BaaS、serverless 和完整的伺服器，只是這些選擇常見的組合方式。
