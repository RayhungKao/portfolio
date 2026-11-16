---
title: "Queue 與 worker：把工作移出請求"
---

**你會學到：** 哪些情況需要 queue 和 worker、它們怎麼把慢的工作從請求裡拆出去、job 怎麼會在資料庫和 queue 之間不見、job 失敗時會怎樣，以及怎麼依「一個 job 是什麼、由誰來讀」選工具。

有些工作不該在觸發它的那個請求裡做。**Queue** 把這些工作存成一個個 job，**worker** 是另一個 process，負責拿出 job 來做。請求不用等工作做完就能回應，job 做到一半失敗了也會重試，不會就這樣不見。

（瀏覽器裡的 Web Worker 也叫「worker」，但那是另一回事，請見 [Browser workers](/blog/browser-workers-boundaries)。這篇講的是後端的 worker。）

## 什麼時候需要

- **Asynchronous processing。** 寄收據、縮放圖片、產生報表：使用者馬上拿到回應，工作在幾秒後做完。影片轉檔要好幾分鐘，比 proxy 願意等的時間長，也超過 serverless function 的執行上限（Vercel：300 到 800 秒）；worker 沒有這種限制。
- **Decoupling。** 訂單服務記下訂單，留下一則訊息。庫存和出貨服務各自照自己的速度去讀；就算出貨服務停了一個小時，訂單還是照樣成立。
- **Load leveling（peak shaving）。** 開賣搶票，一分鐘湧進 2,000 筆訂單。Queue 先把它們收下，worker 用穩定的速度消化，所以資料庫和有 rate limit 的服務商（例如每秒只接受固定次數呼叫的寄信或簡訊 API），看到的是平穩的負載，而不是尖峰。Worker 跑在自己的機器上，可以跟網頁伺服器分開擴充。

這篇接下來都用第一種情況當例子，但用到的東西每種情況都一樣：一個存放 job 的 queue、一個拿 job 來做的 worker、重試，以及執行兩次也不會出事的 job。

## 基本架構

![A queue lets the web request finish before the slow work starts](diagram:queue-and-worker-flow)

伺服器存下訂單，把一個 job 放進 queue，然後馬上回應。Worker 從 queue 裡拿出 job，去做慢的那部分。Queue 是 job 排隊等待的地方，所以也能消化突然湧進來的流量：一分鐘內進來一千筆訂單，就變成一千個 job，worker 能做多快就做多快。

程式碼裡，處理請求的那一端只要這樣寫（用 BullMQ，一個把 job 存在 Redis 的 Node 函式庫）：

```ts
await emails.add('receipt', { orderId: order.id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } })
return Response.json(order, { status: 201 }) // 信還沒產生，就已經回應了
```

Worker 是另一個一直在跑的 process，每拿到一個 job 就呼叫 `sendReceipt`。如果它丟出錯誤，job 會分別在 2、4、8 秒後重試，依此類推。

## 存訂單和放進 queue 是兩次寫入

伺服器先寫資料庫，再寫 queue。這是兩個不同的系統，沒有任何 transaction 能同時包住它們。如果 process 剛好在兩次寫入之間掛掉，訂單存下來了，job 卻沒有，收據就永遠寄不出去。順序反過來也沒用：先放進 queue 的 job 可能在訂單存好之前就執行了，或者訂單存檔失敗，留下一個對應不到任何訂單的 job。這就是 **dual-write problem**（雙重寫入問題）。

| 解法 | 怎麼做（例子） | 代價 |
| --- | --- | --- |
| Outbox | 在建立訂單的同一個 transaction 裡，把「寄出訂單 42 的收據」寫進 `outbox` 表。另外跑一支轉送程式，讀出還沒送出的 row，放進 queue，再標成已送出。 | 要多跑一支轉送程式。如果它在標記之前掛掉，同一筆會被送兩次，所以每個 job 要有固定的 id：BullMQ 遇到已經存在的 `jobId` 會直接忽略。 |
| Queue 跟資料放在同一個資料庫 | 用存在 PostgreSQL 裡的 queue，job 就是在你的 transaction 裡建立的，訂單和 job 在同一個 `COMMIT` 裡一起寫入。pg-boss 支援這種做法，並提供 Drizzle、Knex、Kysely 和 Prisma 的 adapter。 | Job 的流量會跟你的應用程式資料擠在同一個資料庫裡。 |

這兩種做法都沒辦法保證 job 剛好只執行一次，這是下一節的重點。

## Job 失敗的時候

網路會斷、服務商會逾時、程式會有 bug。Queue 對每一種失敗都有處理方式：

- **逐漸拉長間隔的重試。** Job 回到 queue，每次等更久再試，避免一直去打一個已經不太穩的服務商。
- **Dead-letter queue。** 最後一次重試也失敗之後，job 會被移到另一個 queue，讓人去檢查、修好問題，再重新執行。有沒有這個功能要看工具：Amazon SQS 和 pg-boss 有；BullMQ 會把重試用完的 job 放在「failed」集合裡，要保留多久、誰來處理，由你決定；Google Cloud Tasks 則在最後一次重試後直接刪掉 task。
- **Visibility timeout。** 在 Amazon SQS 這類 queue 上，正在處理的 job 會有一段時間不讓其他 worker 看到。如果 worker 掛了、一直沒有回報完成，這個 job 就會重新出現在 queue 裡。

## Job 執行兩次也不能出事

大部分的 queue 保證的是 **at-least-once**：至少送達一次，而不是剛好一次。Worker 可能已經把工作做完，卻在回報完成之前掛掉，於是這個 job 又被執行一次。所以 job 必須是 **idempotent**：執行兩次的結果要跟執行一次一樣。例如只有在 `order.receiptSentAt` 還是空的時候才寄收據，或是把 idempotency key 傳給郵件服務商。這跟[Transaction 與同時寫入](/blog/transactions-and-concurrent-writes)裡處理重複送出是同一個道理，只是用在 job 上。

## 怎麼選

這些工具看起來很像，但最關鍵的差別在於**一個 job 是什麼、由誰來讀**。照順序問自己：

1. **一個 job 有好幾個步驟，中間要等（幾小時、幾天、等人審核），而且當機後要能接著做？** 用 durable workflow：Inngest、Trigger.dev 或 Temporal。
2. **這則訊息是給其他服務讀的，而不是給你自己的 worker？** 用 message broker 或雲端 queue：要在服務之間依規則轉送，用 RabbitMQ；在 AWS 上用 Amazon SQS。如果好幾個 consumer 都要各自讀同一條資料流，或要重新讀一次，那是 Kafka（見表格下方）。
3. **以上都不是，就是你自己 App 的 job。** 用 job queue 函式庫，依你已經在跑的儲存來選：資料在 PostgreSQL、job 要跟資料一起 commit，選 pg-boss 或 Graphile Worker；已經有 Redis，選 BullMQ；大部分是排程工作，選 Agenda。如果在雲端上、不想自己跑任何東西，Amazon SQS 或 Google Cloud Tasks 也能做到一樣的事。

以下細節在 2026 年 10 月對照過各專案的官方文件。

| 類型 | 選擇 | 什麼時候選（例子） | 代價 |
| --- | --- | --- | --- |
| Job queue 函式庫（Redis） | BullMQ | 想要功能完整的 Node 函式庫（重試、延遲執行、重複執行、優先順序），而且本來就有在跑 Redis。例如寄收據。 | Redis 要設成 `noeviction`，BullMQ 也建議開啟 AOF 持久化。沒有 dead-letter queue。 |
| Job queue 函式庫（PostgreSQL） | pg-boss、Graphile Worker | 資料在 PostgreSQL，而且 job 應該跟資料一起 commit。pg-boss 還有 dead-letter queue 和 cron；Graphile Worker 是另一個 Node 加 PostgreSQL 的選擇，有重試和排程。例如訂單和寄收據的 job 在同一個 transaction 裡。 | Job 跟應用程式共用同一個資料庫。 |
| 排程函式庫（MongoDB、PostgreSQL 或 Redis） | Agenda（v6） | 大部分是排程工作：cron、好讀的時間間隔、時區、優先順序。例如每天凌晨兩點產生報表。 | 選它是為了排程功能：第 6 版三種儲存都支援，所以不用看你現在用哪個資料庫。 |
| Message broker | RabbitMQ | 好幾個服務之間需要依規則轉送訊息。例如訂單服務要通知庫存和出貨。 | Broker 要自己維運。Dead letter 預設是在沒有 publisher confirm 的情況下重新發布，所以可能會掉一則；用 quorum queue 才能做到 at-least-once 的 dead letter。 |
| 雲端 queue（AWS） | Amazon SQS | 用 AWS，不想自己維運 broker：有 visibility timeout、超過 `maxReceiveCount` 次就進 dead-letter queue，標準 queue 是 at-least-once。例如產生縮圖的 job。 | 處理 job 的 consumer 要自己寫、自己跑。AWS 提醒，在 FIFO queue 上用 dead-letter queue 可能會打亂訊息順序。 |
| 雲端 queue（Google Cloud） | Cloud Tasks | 用 Google Cloud，想讓 job 依你設定的速率，以 HTTP 請求的方式送到你的 endpoint。例如產生 PDF 的 Cloud Run endpoint。 | 最後一次重試後 task 就被刪掉。Endpoint 必須在時限內回應（預設 10 分鐘，最多 30 分鐘）。 |
| Durable workflow | Inngest、Trigger.dev、Temporal | 工作要撐過一個請求的時間、撐過當機，並且能從最後完成的步驟接著做。Inngest：每個 step 的結果都會保存，例如使用者註冊後等三天，再寄新手教學信。Trigger.dev：跑很久的任務，有 `maxDuration`（每次嘗試的運算時間，等待不算），例如影片轉檔。Temporal：每一步都記在事件紀錄裡的 workflow，例如需要人工審核的貸款申請。 | Inngest：每個 step 都是一個呼叫你 App 的請求，所以要符合主機的時間上限。Trigger.dev：自己架設時沒有 checkpoint 和自動擴充。Temporal：worker 一定要自己跑；不用 Temporal Cloud 的話，伺服器（Go 加一個資料庫）也要自己跑。 |

「Durable」的意思是進度會被保存下來，所以當機之後，工作會從最後完成的那一步接著做，不用從頭來。

表裡沒有 Kafka，因為它是另一種工具：它是一份 log，可以讓好幾個 consumer 各自讀取或重新讀一次，例如一條點擊資料流同時給分析和詐騙偵測使用。重試、延遲執行和 dead letter 都要自己處理；Kafka 4.2 的 share group 加入了逐筆確認訊息的功能，但只有 Java client 支援。只是為了「晚一點再寄這封信」，就要維運一套分散式 log，換到的只是上面那些工具本來就有的功能。

## 什麼時候不需要

如果工作只要幾百毫秒，而且重複執行也沒關係，就直接在請求裡做。Queue 會讓你多一個要維運的儲存、多一個要部署的 process，還會多出一整類新的 bug（重複執行、順序錯亂）。等到請求真的太慢，或掉了一個 job 就會損失金錢時，再加上 queue。

> [!PRINCIPLE] 核心原則
> Queue 把「已經收到」和「已經做完」分開。要確保 job 不會在資料庫和 queue 之間消失，並替每個 job 準備好重試、dead letter 和 idempotency，因為它一定會被執行不只一次。
