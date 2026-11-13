---
title: "即時更新：polling、SSE、WebSocket，以及誰握著連線"
---

**你會學到：** polling、Server-Sent Events 和 WebSocket 有什麼不同、為什麼 serverless function 不適合長時間握著連線，以及三種運作「握住連線那一部分」的方式。

一般的 HTTP 只讓瀏覽器發問。如果伺服器有新消息，例如一則新的聊天訊息或騎手的新位置，它沒有辦法告訴瀏覽器。「即時」就是解決這件事的一整套技巧。

![Normal HTTP versus a WebSocket](diagram:http-vs-websocket)

用一般 HTTP 時，瀏覽器一直問「有新訊息嗎？」。用 WebSocket 時，它開一條連線，伺服器有消息就隨時說。

## 把消息送到瀏覽器的三種方式

![Polling, Server-Sent Events and WebSocket compared](diagram:polling-sse-websocket)

| 方式 | 怎麼運作 | 方向 | 例子 |
| --- | --- | --- | --- |
| Polling | 瀏覽器每隔幾秒再問一次 | 瀏覽器問，伺服器答 | 每 10 秒檢查一次的訂單狀態頁 |
| Server-Sent Events（SSE） | 一個 HTTP 請求保持開著，伺服器串流送出事件；斷線時瀏覽器的 `EventSource` 會自己重連 | 單向，伺服器到瀏覽器，走一般 HTTP | 一個字一個字串流出來的 AI 回覆 |
| WebSocket | 開一條連線，任何一端都可以隨時傳送 | 雙向 | 聊天訊息、外送騎手的位置 |

從夠用的方式裡最簡單的那個開始。Polling 很浪費，但不需要任何特別的東西，訂單狀態頁很少需要更多。當瀏覽器也需要頻繁且快速地傳送（聊天、共用游標），而不只是接收時，才選 WebSocket。

## 誰把連線一直開著？

一條開著的連線需要一個和連線活得一樣久的東西，常常是好幾小時。Serverless function 只能握到它的時間上限為止。Vercel Functions 支援 WebSocket（截至 2026 年 11 月仍是公開測試版），並在 function 到達最長執行時間時關閉連線：Hobby 方案 300 秒，Pro 最多 800 秒。之後用戶端必須重新連線，而且 function 在呼叫之間什麼都不記得。所以問題在於：誰能在你需要的時間內一直握著連線。有三種安排方式。

![Three ways to run the part that holds connections](diagram:three-ways-to-realtime)

| 安排 | 怎麼運作 | 選項 | 什麼時候選（例子） | 你放棄什麼 |
| --- | --- | --- | --- | --- |
| 資料庫推送 | 平台監看你的資料，把變更推給訂閱的瀏覽器。 | Supabase Realtime（透過 WebSocket 的 Postgres Changes，依你的 RLS policy 過濾）；Convex（資料變更時 query 重新執行，結果推給訂閱的用戶端）；Appwrite Realtime | 畫面是你已經存下的 row 的即時檢視。例如在每台裝置上都會更新的筆記清單。 | 你被綁在那個平台上，而且只有存在它資料庫裡的資料能被推送。 |
| 託管的 pub/sub 服務 | 一個服務握住每一條瀏覽器連線。你的 function 只要用一次短呼叫發佈。 | Ably（伺服器可以透過 REST 發佈，不需要持久連線）；AWS API Gateway 的 WebSocket API（由 gateway 握著每條連線，每收到一則訊息就呼叫一次 Lambda function，閒置 10 分鐘或滿 2 小時就關閉）；Pusher Channels（有備援機制的 WebSocket、私人與 presence channel）；Supabase Realtime Broadcast | 一個 serverless webhook 必須告訴頁面「已付款」。例如金流服務呼叫你的 function，它再發佈到 `order-123` 這個 channel。 | 多一個要付費的服務。訊息是事件，不是你資料庫裡的 row。 |
| 你自己的 WebSocket 伺服器 | 你跑一個握住所有連線的 process。 | 你所用語言的 WebSocket 函式庫，放在 VPS 或 container 上 | 你能掌控的雙向、高頻訊息。例如聊天，或編輯器裡的共用游標。 | 工作量最大（見下方）。 |

自己的伺服器需要三樣另外兩種免費提供的東西：

- **連線時的身分驗證。** 瀏覽器無法在 WebSocket 上設定自訂 header，所以要用 cookie，或把 token 當作第一則訊息送出。
- **心跳與重連。** 連線會默默斷掉，所以要定時 ping，並讓用戶端以退避方式重連。
- **不只一台伺服器。** 抵達伺服器 A 的訊息必須送到連在伺服器 B 上的用戶端，通常透過 Redis pub/sub 之類的共用通道。

## 怎麼選

| 如果你需要 | 選 | 例子 |
| --- | --- | --- |
| 只是偶爾更新 | Polling；如果伺服器本來就會推送，用 SSE | 訂單狀態 |
| 你資料庫裡已有資料的即時更新 | 會推送的資料庫 | 筆記清單 |
| 從 serverless function 推送事件 | 託管的 pub/sub 服務 | 「已收到付款」 |
| 你能掌控的雙向、高頻訊息 | 你自己的 WebSocket 伺服器 | 聊天 |

上面的產品已於 2026 年 10 月對照它們自己的文件確認。

> [!PRINCIPLE] 核心原則
> 選能滿足需求的最簡單方式，並先決定誰握著開著的連線。Serverless function 只能握到它的時間上限為止。
