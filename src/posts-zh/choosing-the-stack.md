---
title: 選擇技術棧
---

**你會學到：** 怎麼逐項能力挑選技術棧、三種常見的組合是什麼，以及能指向其中一種的三個問題。

「我該用 Supabase、Vercel，還是自己的伺服器？」這個問法把三樣東西當成唯一的選項。它們其實是幾種常見的選擇組合，組合裡的每個選擇通常都能單獨替換。

## 逐項能力來選

列出 App 需要什麼，然後一列一列地選。

![Three packages and a mixed setup, capability by capability](diagram:capability-by-package-matrix)

先看 PostgreSQL 那一列。每一欄都是 PostgreSQL，唯一的差別是誰在跑它：Supabase、Neon，還是你自己。右邊混合的那一欄說明了這個練習的重點：它只用 Firebase 處理登入，其他全部放在自己的 API 裡，因為每一格都能單獨替換。

![Firebase for login only, own API for data](diagram:firebase-login-with-own-api)

## 三種組合

| 組合 | 你得到什麼 | 適合 | 代價 |
| --- | --- | --- | --- |
| Backend-as-a-service（BaaS） | 由同一個供應商提供登入、資料庫、檔案和存取規則。 | 放在 Supabase 上的筆記 App，每個使用者只看到自己的筆記。 | 複雜的邏輯不好寫，而且你會依賴廠商。 |
| Serverless function | 依需求執行的小段程式碼。你不用部署伺服器。 | 一天只跑幾次的 Stripe webhook。 | 有時間限制、不能長連線、有冷啟動。 |
| 完整伺服器 | 一個持續執行的行程，放在 VPS 或容器平台上。 | 有很多用戶端的外送 API，或 WebSocket 聊天。 | 你要自己維運和擴展。 |

Backend-as-a-service 和 function 合起來就是所謂的 **serverless**：依 Mike Roberts 的定義，serverless 涵蓋這兩者，可以只用其中一種，也可以一起用（[martinfowler.com](https://martinfowler.com/articles/serverless.html)）。兩者都沒有需要你去跑的伺服器。

在 BaaS 裡，規則放在資料庫中。以 Supabase 來說，**列級安全性**（row-level security，RLS）把規則寫成 SQL，即使瀏覽器直接和資料庫溝通，資料庫也會強制執行：

```sql
create policy "users manage their own notes" on notes
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

`to authenticated` 把規則限制在已登入的使用者，而把 `auth.uid()` 包在 `select` 裡，讓 Postgres 每個敘述只計算一次，而不是每一列算一次。這兩點都依照 Supabase 自己的範例。

## Serverless 在實務上的意思

Serverless function 有五個值得知道的特性：

- **縮到零。** 沒有流量時，什麼都不跑，也不計費。
- **無狀態。** 兩次呼叫可能跑在不同的機器上，所以它們之間不會在記憶體裡記住任何東西。
- **冷啟動。** 閒置一段時間後的第一次呼叫會比較慢。
- **時間限制。** 每次呼叫有最長執行時間，所以長時間的工作放不進去。
- **連線池。** 大量短命的 function 可能耗盡資料庫的連線數，所以它們要透過 pooler 連線。

Function 也只能把連線握到時間上限為止（Vercel Functions 的 WebSocket 會在 300 到 800 秒後關閉），所以要開好幾小時的聊天，serverless 常搭配託管的即時服務：Supabase Realtime、Ably 或 Pusher，或 Cloudflare Durable Objects。在定期輪詢的頁面和完整的 WebSocket 伺服器之間，有一整排選項，[Realtime updates](/blog/realtime-updates) 會一一介紹。

## Function 檔案放在哪裡

每個平台對程式碼放在哪裡都有自己的慣例。

| 平台 | Function 放在哪裡 |
| --- | --- |
| Next.js App Router | `app/api/.../route.ts`（Pages Router 用的是 `pages/api/`） |
| Vercel，不使用 Next.js | `api/` |
| Netlify | `netlify/functions/` |
| AWS Lambda | 用 SAM、SST 或 CDK 定義，透過 API Gateway 或 Function URL 對外 |
| Cloudflare Workers | 一個匯出 `fetch` 的檔案，用 Wrangler 部署 |
| Supabase | `supabase/functions/<name>/index.ts` |
| Firebase | `functions/` |

## 三個問題

1. **App 只需要資料存取加上權限嗎？** 選 BaaS。RLS 涵蓋規則，你只需要寫很少的後端程式；需要一些自訂邏輯時，Supabase 的 Edge Functions 和 Cloud Functions for Firebase（Google）可以替你執行。
2. **有自訂邏輯，但規模小、時間短、由事件觸發嗎？** 選 serverless function。Webhook、表單處理、呼叫需要 secret key 的 API，或縮放圖片都適合。
3. **需要長連線、長時間任務、大量運算，或很多共用同一套規則的用戶端嗎？** 選完整伺服器。要自己跑 VPS 還是用託管的執行環境，要用大型雲端還是獨立供應商，是[伺服器程式在哪裡執行](/blog/running-server-code)裡的決策樹。

很多人說 Supabase 是第一個全端專案的合理預設。截至 2026 年 10 月這是常見的看法，不是量測出來的事實，而且只在你的需求屬於第 1 題時成立。如果不是，這張矩陣讓你可以混搭。

> [!NOTE] 其他內容在哪裡
> 依照組合內容比較的六個平台，以及列級安全性怎麼運作，在 [BaaS 平台](/blog/baas-platforms)。VPS、容器和 PaaS 是什麼、怎麼在它們之間做選擇，在[伺服器程式在哪裡執行](/blog/running-server-code)；成本怎麼算，在[什麼時候選 VPS 划算](/blog/when-a-vps-pays-off)。

> [!PRINCIPLE] 核心原則
> 選擇的單位是每一項能力。BaaS、serverless 和完整伺服器只是這些選擇的常見組合。
