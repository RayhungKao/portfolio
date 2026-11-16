---
title: 混搭的實例，以及什麼時候該換
---

**你會學到：** 實際的專案怎麼混搭各種服務、五個範例架構裡每一項為什麼這樣選，以及出現哪些訊號時該換掉某個選擇。

實際的專案很少剛好就是某一種組合。一個訂閱制 App 可能同時用了託管的登入服務、serverless 資料庫、金流服務，再加上處理長時間工作的 worker，每一樣都有它的理由。在看五個完整的架構之前，先用兩個例子說明這些服務怎麼串在一起。

## 用各種服務拼出來的訂閱制 SaaS

![A subscription SaaS built from mixed parts](diagram:saas-hub-diagram)

中間是放在 Vercel 上的 Next.js。Clerk 負責登入，Next.js 驗證 Clerk 發的 session。資料存在 Neon 上的 PostgreSQL。Stripe 付款成功後，會呼叫 Next.js 上的 webhook 通知你。產生一份完整的報表太久，function 跑不完，所以 Next.js 把它當成一個事件交給 Inngest。Inngest 再一步一步呼叫你放在 Fly.io 上的 worker App 的 job endpoint，worker 做完報表後存回資料庫。

Stripe webhook 正好說明了為什麼串接這些服務要小心。付款成功時 Stripe 會呼叫你的 URL，如果你回應太慢或失敗，它會再呼叫一次。所以同一個事件可能會收到兩次，你的伺服器不能因此把同一筆訂閱標成已付款兩次。

```ts
// app/api/stripe/webhook/route.ts
export async function POST(request: Request) {
  const event = await verifyStripeSignature(request)    // 拒絕偽造的呼叫
  await db.transaction(async (tx) => {
    const fresh = await tx.insertProcessedEvent(event.id) // event id 是 PRIMARY KEY
    if (!fresh) return                                    // 處理過了，跳過
    await tx.markSubscriptionPaid(event.data.object)
  })
  return new Response('ok')
}
```

前面幾篇的三個觀念在這裡都用上了。簽章檢查用的是只存在伺服器上的機密。事件 ID 是 primary key，這是一個 constraint，讓資料庫幫你擋掉重複的事件。Transaction 讓「記錄這個事件」和「標成已付款」要嘛一起成功，要嘛一起失敗。

## 五個架構，以及為什麼這樣選

![Five real scenarios, with the reason for every choice](diagram:five-scenarios-cell-reasons)

**1. 有聯絡表單的作品集。** 不用登入，也沒有資料要存。只需要一個 function 寄信，因為唯一要保密的是郵件 API 的金鑰。靜態檔案加一個 function，放在 Vercel 或 Cloudflare 上，完全不用管伺服器。

**2. 20 人公司的請假系統。** Supabase 提供登入和 PostgreSQL，所以可以用 RLS 依使用者 ID，只讓他看到自己的資料，或自己部門的資料。用一個 Edge Function 發 Slack 訊息，因為 Slack 的金鑰必須留在伺服器上。沒有人需要即時更新，兩週就能上線。

**3. 訂閱制 SaaS。** 三個人的團隊不該自己重寫登入，所以用 Clerk。帳務資料彼此有關聯，用 Neon 的 PostgreSQL 很適合，而且使用者少的時候它會縮到零。Webhook 執行時間很短，用 Vercel 上的 Route Handler 就夠了。報表會超過 function 的時間上限，所以才需要 worker。

**4. 外送和叫車。** 三種 client 共用同一套帳號，所以登入要用團隊自己掌控的函式庫。訂單資料彼此有關聯，地圖相關的查詢交給 PostGIS。很多 client 要共用複雜的派單和計價規則，所以這些規則該放在用 NestJS 或 Go 寫的完整伺服器上。通知交給 queue 和 worker 發送，才不會拖慢請求；外送員的位置每秒都在變，所以用 Redis 和 WebSocket 傳送；流量穩定，適合一直開著的 container。

**5. 兩個人做的手機聊天 MVP。** Firebase Auth 和 Firestore 用的是同一套 SDK，而且 SDK 內建離線同步。一開始用 security rules 就夠了，之後再用 Cloud Functions 加上內容審核和搜尋。一家廠商、一個管理介面、不用管伺服器，很適合兩人團隊。

## 該換的訊號

一個選擇只是「現在」適合。出現下面這些訊號，就表示它可能不再適合了。

| 訊號 | 怎麼調整 | 例子 |
| --- | --- | --- |
| 規則變得有好幾個步驟、很複雜 | 改寫成資料庫 function，或搬到自己的伺服器。 | 請假要經過好幾層簽核，一條 RLS 規則已經寫不下。 |
| 工作超過時間上限 | 改用跑在 container 裡的 worker。 | 產生一份要花八分鐘的報表。 |
| 需要長時間的連線 | 加一台 WebSocket 伺服器，或用託管的即時服務。 | 每秒更新的即時儀表板。 |
| 流量大而且穩定 | 改用一直開著的服務。 | 按呼叫次數計費的 function，現在比一個小 container 還貴。 |
| 擔心被廠商綁住 | 把資料搬到 PostgreSQL，登入繼續用原本的。 | 把 Firestore 的資料匯出到 PostgreSQL，繼續用 Firebase Auth。 |

Inngest 和 Trigger.dev 這類託管的 job 服務，讓你不用自己架 queue 也能跑長時間的工作，但它們各有限制：Inngest 的每一個 step 還是透過一個請求呼叫你的 App，所以要符合你主機的時間上限；Trigger.dev 的 task 則有一個計算運算時間的 `maxDuration`。[Queues and workers](/blog/queues-and-workers) 把它們和其他做法放在一起比較（2026 年 10 月確認過）。決定之前，請依你自己的需求，再確認一次價格和限制。

換掉某個選擇，不代表當初選錯了。一個便宜、可以一項一項替換的起點，通常比一個替還不存在的流量設計的完美架構更好。

> [!PRINCIPLE] 核心原則
> 先解決眼前的問題，同時留意該換的訊號。因為每一項能力都能單獨替換，換掉其中一項，不代表全部要重做。
