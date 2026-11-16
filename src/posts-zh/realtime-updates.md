---
title: "即時更新：polling、SSE、WebSocket，以及由誰維持連線"
---

**你會學到：** polling、Server-Sent Events 和 WebSocket 差在哪裡、為什麼 serverless function 不適合長時間維持連線，以及三種負責「維持連線」的做法。

一般的 HTTP 只能由瀏覽器發問。伺服器有新消息時，例如一則新的聊天訊息、外送員的新位置，它沒辦法主動告訴瀏覽器。所謂「即時」，就是解決這個問題的一系列技巧。

![Normal HTTP versus a WebSocket](diagram:http-vs-websocket)

用一般的 HTTP，瀏覽器只能一直問「有新訊息嗎？」。用 WebSocket，瀏覽器先開好一條連線，伺服器有消息就可以隨時傳過來。

## 把消息送到瀏覽器的三種方式

![Polling, Server-Sent Events and WebSocket compared](diagram:polling-sse-websocket)

| 方式 | 怎麼運作 | 方向 | 例子 |
| --- | --- | --- | --- |
| Polling | 瀏覽器每隔幾秒就再問一次 | 瀏覽器問，伺服器答 | 每 10 秒檢查一次的訂單狀態頁 |
| Server-Sent Events（SSE） | 一個 HTTP 請求一直開著，伺服器陸續把事件送過來；斷線時，瀏覽器的 `EventSource` 會自動重新連線 | 單向，從伺服器到瀏覽器，用的是一般的 HTTP | 一個字一個字跑出來的 AI 回覆 |
| WebSocket | 開一條連線，兩邊都可以隨時傳訊息 | 雙向 | 聊天訊息、外送員的位置 |

先選夠用的方式裡最簡單的那一種。Polling 雖然浪費，但不需要任何特別的東西，訂單狀態頁通常這樣就夠了。只有當瀏覽器也要頻繁、快速地傳送資料（聊天、多人共用的游標），而不只是接收時，才需要 WebSocket。

## 誰來維持連線？

一條一直開著的連線，需要一個跟它活得一樣久的程式來維持，常常一開就是好幾個小時。Serverless function 只能撐到它的執行時間上限。Vercel Functions 支援 WebSocket（截至 2026 年 11 月仍是公開測試版），但 function 一到最長執行時間就會關掉連線：Hobby 方案是 300 秒，Pro 方案最多 800 秒。之後 client 必須重新連線，而且 function 不會記得上一次呼叫的任何東西。所以要先決定：誰能在你需要的時間內一直維持連線？有三種做法。

![Three ways to run the part that holds connections](diagram:three-ways-to-realtime)

| 做法 | 怎麼運作 | 選擇 | 什麼時候選（例子） | 代價 |
| --- | --- | --- | --- | --- |
| 由資料庫推送 | 平台盯著你的資料，一有變動就推給有訂閱的瀏覽器。 | Supabase Realtime（Postgres Changes，透過 WebSocket 推送，並依你的 RLS policy 過濾）；Convex（資料一變，query 就重新執行，結果推給有訂閱的 client）；Appwrite Realtime | 畫面顯示的就是你已經存起來的資料，只是要即時更新。例如在每台裝置上都會同步更新的筆記清單。 | 會被綁在這個平台上，而且只有存在它資料庫裡的資料能被推送。 |
| 託管的 pub/sub 服務 | 由一個服務負責維持每一條瀏覽器連線。你的 function 只要做一次很短的呼叫，把訊息發布出去。 | Ably（伺服器可以透過 REST 發布，不用一直連著）；AWS API Gateway 的 WebSocket API（由 gateway 維持每條連線，每收到一則訊息就呼叫一次 Lambda function，閒置 10 分鐘或滿 2 小時就斷線）；Pusher Channels（WebSocket 不通時會改用備援方式，支援私人和 presence channel）；Supabase Realtime Broadcast | 一個 serverless webhook 需要通知頁面「已付款」。例如金流服務呼叫你的 function，function 再把訊息發布到 `order-123` 這個 channel。 | 要多付一個服務的錢。送出去的是事件，不是你資料庫裡的資料。 |
| 自己的 WebSocket 伺服器 | 你自己跑一個 process，維持所有的連線。 | 你用的語言的 WebSocket 函式庫，放在 VPS 或 container 上 | 雙向、頻繁，而且要自己掌控的訊息。例如聊天，或編輯器裡多人共用的游標。 | 要做的事最多（見下方）。 |

自己架伺服器的話，有三件事要自己處理，另外兩種做法則已經幫你做好了：

- **連線時確認身分。** 瀏覽器不能在 WebSocket 上加自訂的 header，所以要用 cookie，或把 token 當成第一則訊息送過去。
- **心跳和重新連線。** 連線可能會在沒有任何通知的情況下斷掉，所以要定時送 ping，並讓 client 在斷線後隔一段時間重連，而且每次間隔越拉越長。
- **伺服器不只一台。** 送到伺服器 A 的訊息，必須能傳給連在伺服器 B 上的 client，通常要靠 Redis pub/sub 這類共用的通道。

## 怎麼選

| 如果你需要 | 選 | 例子 |
| --- | --- | --- |
| 偶爾更新就好 | Polling；如果伺服器本來就會推送，用 SSE | 訂單狀態 |
| 資料庫裡現有資料的即時更新 | 會推送的資料庫 | 筆記清單 |
| 從 serverless function 推送事件 | 託管的 pub/sub 服務 | 「已收到付款」 |
| 雙向、頻繁，而且要自己掌控的訊息 | 自己的 WebSocket 伺服器 | 聊天 |

上面提到的產品，都在 2026 年 10 月對照過它們的官方文件。

> [!PRINCIPLE] 核心原則
> 選能滿足需求的最簡單方式，並且先決定由誰來維持那條一直開著的連線。Serverless function 只能撐到它的執行時間上限。
