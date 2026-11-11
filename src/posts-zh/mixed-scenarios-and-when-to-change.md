---
title: 混合情境，以及什麼時候該改
---

**你會學到：** 真實專案怎麼組合各種服務、五個範例架構裡每一格為什麼這樣選，以及哪些訊號告訴你該改變某個選擇。

真實專案很少剛好符合某一種組合。一個訂閱制 App 可能用託管的登入、serverless 資料庫、金流服務，以及處理長時間工作的 worker，每一個都有自己的理由。在看五個完整架構之前，先用兩個例子說明這些零件怎麼接在一起。

## 用零件拼成的訂閱制 SaaS

![A subscription SaaS built from mixed parts](diagram:saas-hub-diagram)

放在 Vercel 上的 Next.js 位在中央。Clerk 處理登入，Next.js 驗證它簽發的 session。資料寫進 Neon 上的 PostgreSQL 資料庫。Stripe 透過呼叫 Next.js 這邊的 webhook 回報付款。一份長報表對 function 來說太慢了，所以 Next.js 把它當作事件送給 Inngest。Inngest 再一步一步呼叫你放在 Fly.io 上的 worker App 的 job endpoint，worker 把完成的報表存進資料庫。

Stripe webhook 說明了為什麼這些零件需要小心處理。付款成功時 Stripe 會呼叫你的 URL，如果你回應太慢或失敗，它會再呼叫一次。所以同一個事件可能抵達兩次，而 handler 不能把訂閱標記為已付款兩次。

```ts
// app/api/stripe/webhook/route.ts
export async function POST(request: Request) {
  const event = await verifyStripeSignature(request)    // 拒絕偽造的呼叫
  await db.transaction(async (tx) => {
    const fresh = await tx.insertProcessedEvent(event.id) // event id 是 PRIMARY KEY
    if (!fresh) return                                    // 看過了：跳過
    await tx.markSubscriptionPaid(event.data.object)
  })
  return new Response('ok')
}
```

前面三個概念在這裡會合。簽章檢查是留在伺服器上的機密。事件 ID 上的主鍵是一個約束，讓資料庫負責去重。交易讓「記錄事件」和「標記已付款」一起成功或一起失敗。

## 五個架構，以及為什麼

![Five real scenarios, with the reason for every choice](diagram:five-scenarios-cell-reasons)

**1. 有聯絡表單的作品集。** 沒有登入，也沒有東西要存。一個 function 寄信，因為只有郵件 API 的金鑰必須保密。靜態檔案加上一個 function 放在 Vercel 或 Cloudflare 上，沒有伺服器要照顧。

**2. 20 人的請假系統。** Supabase 提供登入和 PostgreSQL 資料庫，所以 RLS 可以用使用者的 ID 只顯示他自己的資料列，或他部門的資料列。一個 Edge Function 發訊息到 Slack，因為 Slack 金鑰必須留在伺服器上。沒有人需要即時更新，兩週就能上線。

**3. 訂閱制 SaaS。** 三人團隊不該重做登入，所以用 Clerk。帳務資料是關聯式的，所以 Neon 的 PostgreSQL 很合適，而且使用者少時它會縮到零。Webhook 很短，所以 Vercel 上的 route handler 就夠了。報表會超過 function 的時間限制，這就是 worker 存在的原因。

**4. 外送與叫車。** 三種用戶端共用一套帳號，所以登入是團隊自己掌控的函式庫。訂單是關聯式的，PostGIS 回答地圖查詢。很多用戶端共用複雜的派單和計價規則，所以 NestJS 或 Go 的完整伺服器是放這些規則的正確位置。Queue 和 worker 發送通知而不拖慢請求；騎手的位置每秒都在變，所以用 Redis 和 WebSocket 傳遞；穩定的流量適合常駐的容器。

**5. 兩人做的手機聊天 MVP。** Firebase Auth 和 Firestore 共用一套 SDK，而且 SDK 內建離線同步。一開始用 security rules 就夠了，之後再用 Cloud Functions 加上內容審核和搜尋。一個廠商、一個控制台、沒有伺服器，很適合兩人團隊。

## 該改變的訊號

一個選擇是對「現在」而言正確的。以下訊號表示它已經不再正確。

| 訊號 | 調整 | 例子 |
| --- | --- | --- |
| 規則變得多步驟且複雜 | 搬到資料庫 function 或你自己的伺服器。 | 有簽核流程的請假規則已經塞不進一條 RLS 規則。 |
| 工作超過時間限制 | 搬到容器 worker。 | 要花八分鐘的報表產生。 |
| 需要長連線 | 加上 WebSocket 伺服器或託管的即時服務。 | 每秒更新的即時儀表板。 |
| 流量大而穩定 | 搬到常駐的服務。 | 按呼叫計費的 function 現在比一個小容器還貴。 |
| 擔心被廠商綁住 | 把資料搬到 PostgreSQL，保留登入。 | 把 Firestore 資料匯出到 PostgreSQL，繼續用 Firebase Auth。 |

Inngest 和 Trigger.dev 這類託管的 job 服務可以在沒有自己的 queue 的情況下跑長時間工作，但各有各的限制：Inngest 的一個 step 仍然是以對你 App 的請求執行，所以必須符合你主機的時間限制；Trigger.dev 的 task 則有一個計算運算時間的 `maxDuration`。[Queues and workers](/blog/queues-and-workers) 把它們和其他選項做了比較（2026 年 10 月確認）。決定之前，請依你自己的需求確認價格和限制。

這些改變都不代表第一個選擇是錯的。一個便宜、能一格一格替換的起點，通常比為你還沒有的流量設計的完美架構更好。

> [!PRINCIPLE] 核心原則
> 為眼前的問題做選擇，並留意訊號。因為每項能力都能單獨替換，改變其中一項不代表要全部重做。
