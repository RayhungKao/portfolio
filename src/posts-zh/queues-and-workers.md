---
title: "Queue 與 worker：在回應之後才做慢的工作"
---

**你會學到：** queue 和 worker 怎麼把慢的工作從請求中分離出來、一個 job 怎麼在你的資料庫和 queue 之間遺失、job 失敗時會怎樣，以及怎麼依 job 存放的位置選擇 queue。

有些工作不屬於請求的一部分：寄信、縮放圖片、產生報表、透過很慢的供應商刷卡。如果 handler 直接在當下做，使用者就得等，做到一半失敗也會遺失。**Queue（佇列）**和 **worker** 能同時解決這兩個問題。

（「Worker」也是瀏覽器裡 Web Worker 的名字，那是另一回事，見 [Browser workers](/blog/browser-workers-boundaries)。這篇談的是後端的那一種。）

## 形狀

![A queue lets the web request finish before the slow work starts](diagram:queue-and-worker-flow)

API 存下訂單、把一個 job 加進 queue，然後立刻回應。Worker 從 queue 取出 job，做慢的那一部分。Queue 是 job 等待的地方，所以它也能吸收突發流量：一分鐘內一千筆訂單會變成一千個 job，以 worker 能負荷的速度逐一處理。

在程式碼裡，請求這一端只有這樣（BullMQ，一個把 job 存在 Redis 的 Node 函式庫）：

```ts
await emails.add('receipt', { orderId: order.id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } })
return Response.json(order, { status: 201 }) // 在信件產生之前就已經回應了
```

Worker 是一個獨立、長時間執行的行程，接收每個 job 並呼叫 `sendReceipt`。如果它丟出錯誤，job 會在 2、4、8 秒之後依序重試。

## 存檔和放進佇列是兩次寫入

Handler 先寫資料庫，再寫 queue。這是兩個系統，沒有任何交易能同時涵蓋兩者。如果行程在兩者之間當掉，訂單存在、job 卻不存在，收據就永遠不會寄出。調換順序也沒用：先加的 job 可能在訂單存檔前就執行，或者存檔失敗，留下一個屬於根本不存在之訂單的 job。這就是**雙寫問題（dual-write problem）**。

| 解法 | 怎麼運作（例子） | 你放棄什麼 |
| --- | --- | --- |
| Outbox | 在建立訂單的同一個交易裡，把「寄送訂單 42 的收據」寫進 `outbox` 表。一個中繼程式讀取尚未送出的列，放進 queue 並標記為已送出。 | 你要跑一個中繼程式。如果它在標記之前當掉，那一列會被再送一次，所以要給每個 job 一個穩定的 id：BullMQ 會忽略 `jobId` 已存在的新增。 |
| 和資料庫同處的 queue | 住在 PostgreSQL 裡的 queue 會在你的交易內建立 job，所以訂單和 job 共用同一個 `COMMIT`。pg-boss 支援這點，並提供 Drizzle、Knex、Kysely 和 Prisma 的 adapter。 | Job 的流量和你的應用程式資料共用同一個資料庫。 |

兩種解法都無法讓 job 剛好只執行一次，這是下一節的主題。

## 當 job 失敗時

網路會失敗、供應商會逾時、程式有 bug。Queue 給每一種失敗一個去處：

- **帶退避的重試。** Job 回到 queue，每次等得更久，這樣不會猛打一個正在掙扎的供應商。
- **Dead-letter queue（死信佇列）。** 最後一次重試失敗後，job 會移到另一個 queue，讓人去查看、修正原因並重新執行。有沒有這個功能取決於工具。Amazon SQS 和 pg-boss 有。BullMQ 把重試用盡的 job 放在「failed」集合裡，要保留多久、由誰查看由你決定。Google Cloud Tasks 在最後一次重試之後就刪除 task。
- **Visibility timeout（可見性逾時）。** 在 Amazon SQS 這類 queue 上，正在處理的 job 會對其他 worker 隱藏一段時間。如果 worker 死掉、一直沒有確認，job 就會重新出現。

## Job 必須能安全地執行兩次

大多數 queue 承諾的是**至少一次（at least once）**投遞，而不是剛好一次。Worker 可能完成了工作，卻在確認之前當掉，於是 job 又執行一次。所以 job 必須是**冪等的（idempotent）**：執行兩次的效果必須和執行一次相同。只在 `order.receiptSentAt` 為空時才寄送收據，或把 idempotency key 傳給郵件供應商。這和[交易與並行寫入](/blog/transactions-and-concurrent-writes)裡的重複送出是同一個概念，只是套用在 job 上。

## 怎麼選

從 job 存放在哪裡開始，因為這決定了你要跑什麼。細節已於 2026 年 10 月對照各專案自己的文件確認。

| 存在 | 選項 | 什麼時候選（例子） | 你放棄什麼 |
| --- | --- | --- | --- |
| Redis | BullMQ | 你想要功能完整的 Node 函式庫（重試、延遲與重複 job、優先順序），而且已經在跑 Redis。例如收據信。 | Redis 需要設定 `noeviction`，而且依 BullMQ 的建議要開 AOF 持久化。沒有 dead-letter queue。 |
| PostgreSQL | pg-boss、Graphile Worker | 你的資料在 PostgreSQL，而且 job 應該和它一起 commit。pg-boss 額外提供 dead-letter queue 和 cron；Graphile Worker 是 Node 加 PostgreSQL 的另一個選擇，有重試和排程 job。例如一筆訂單和它的收據 job 在同一個交易裡。 | Job 和你的應用程式資料庫共用。 |
| MongoDB、PostgreSQL 或 Redis | Agenda（v6） | 工作大多是排程：cron 或易讀的時間間隔、時區、優先順序。例如每晚凌晨兩點的報表。 | 為了排程功能選它：第 6 版三種儲存都支援，所以你現有的資料庫不是決定因素。 |
| Message broker | RabbitMQ | 好幾個服務之間需要路由規則。例如訂單服務通知庫存和出貨。 | 你要自己跑 broker。死信訊息預設是在沒有 publisher confirm 的情況下重新發佈，所以可能會遺失一則；quorum queue 支援至少一次的死信處理。 |
| AWS | Amazon SQS | 你在 AWS 上，不想自己跑 broker：visibility timeout、超過 `maxReceiveCount` 後進 dead-letter queue、標準 queue 至少一次投遞。例如縮圖 job。 | Consumer 要自己寫、自己跑。AWS 警告在 FIFO queue 上使用 dead-letter queue 可能會打亂訊息順序。 |
| Google Cloud | Cloud Tasks | 你在 Google Cloud 上，想讓 job 以 HTTP 請求的形式、依你設定的速率送到你的 endpoint。例如產生 PDF 的 Cloud Run endpoint。 | Task 在最後一次重試後就被刪除。Endpoint 必須在期限內回應（預設 10 分鐘，最多 30 分鐘）。 |
| 託管、durable | Inngest、Trigger.dev、Temporal | 活得比一個請求或一次當機更久、應該從最後完成的步驟繼續的工作。Inngest：結果會被保存的 step，例如註冊、等三天、寄送新手引導信。Trigger.dev：有 `maxDuration`（每次嘗試的運算時間，不含等待）的長任務，例如影片轉檔。Temporal：每一步都記錄在事件歷史裡的 workflow，例如要等人審核的貸款申請。 | Inngest：每個 step 都以對你 App 的請求執行，所以必須符合主機的時間限制。Trigger.dev：自己架設時沒有 checkpoint 和自動擴展。Temporal：無論如何 worker 都要自己跑，除非用 Temporal Cloud，否則伺服器（Go 加上一個資料庫）也要自己跑。 |

「Durable（持久的）」意思是進度會被保存，所以當機後工作會從最後完成的步驟繼續，而不是從頭開始。

Kafka 不在表裡，因為它是另一種工具：一份可以讓多個 consumer 各自讀取或重播的 log，例如一條點擊串流同時餵給分析和詐騙偵測。重試、延遲和死信都留給你自己處理；Kafka 4.2 的 share group 加入了逐則訊息的確認，但只支援 Java 用戶端。為了「之後寄這封信」，你得扛下一個分散式 log，才能得到上面那些列免費提供的功能。

## 什麼時候不需要

如果工作只要幾百毫秒，而且重複執行無害，就直接在當下做。Queue 會多出一個要跑的儲存、一個要部署的行程，以及一整類新的 bug（重複、順序）。等到請求太慢，或遺失一個 job 會造成金錢損失時，再加上它。

> [!PRINCIPLE] 核心原則
> Queue 把「已接受」和「已完成」分開。確保 job 不會在資料庫和 queue 之間遺失，並給每個 job 重試、死信去處和冪等性，因為它一定會被執行不只一次。
