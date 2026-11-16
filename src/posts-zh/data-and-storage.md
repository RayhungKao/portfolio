---
title: 資料與儲存
---

**你會學到：** 後端常用的三種儲存方式、七種資料庫各適合什麼，以及看懂一份資料表設計需要的關聯式資料庫基本詞彙。

後端不會把所有資料都放在同一個地方，而是看資料長什麼樣子、會怎麼被讀寫，放到最合適的地方。

![Three kinds of storage behind a backend](diagram:three-kinds-of-storage)

| 儲存 | 放什麼 | 為什麼適合 | 例子 |
| --- | --- | --- | --- |
| 資料庫 | 要查詢、不能弄丟的結構化資料 | 能查詢、能建立關聯、能設 constraint | PostgreSQL 裡的使用者、訂單和庫存。 |
| 快取 | 可以重新算出來的暫存資料 | 從記憶體讀取，非常快，不見了也沒關係 | Redis 裡的登入 session、「熱銷前 10 名」清單。 |
| 物件儲存 | 整個檔案一次讀取的大檔案 | 便宜、容量大、可以直接用 URL 提供 | S3 裡的商品照片和使用者上傳的影片。 |

要判斷一份資料能不能只放快取，問一個問題就好：如果它明天不見了，你能重建嗎？不能的話，就要放在資料庫。

## 七種資料庫

「資料庫」其實包含好幾種不同的工具，每一種都是針對某種資料型態設計的。

| 類型 | 資料長什麼樣子 | 產品 | 適用情境 |
| --- | --- | --- | --- |
| 關聯式 | 一張張表格，row 之間互相參照 | PostgreSQL、MySQL | 訂單、顧客、商品。 |
| 文件式 | 有巢狀結構、像 JSON 的紀錄 | MongoDB、Firestore | 訊息欄位不固定的手機聊天 App。 |
| Key-value | 一個 key 對一個值，速度非常快 | Redis、DynamoDB | Session store、rate limit 的計數器。 |
| 搜尋 | 依關聯程度排序的文字 | Elasticsearch、Meilisearch | 打錯字也找得到的搜尋框。 |
| 時間序列 | 依時間排列的測量數據 | TimescaleDB、InfluxDB | 伺服器監控指標、感測器數值。 |
| 圖 | 一個個項目，以及它們之間的關係 | Neo4j | 「朋友的朋友」推薦。 |
| 向量 | 用一串數字表示語意 | pgvector、Pinecone | 替 AI 助理找出內容相近的文件。 |

## 為什麼 PostgreSQL 通常是預設選擇

需求沒什麼特別的話，就從 PostgreSQL 開始。很多團隊開新的網頁專案都預設用它，理由很實際：它是關聯式資料庫，能處理大部分 App 都有的結構化資料；它的 transaction 很完整，下一篇會講到；它也能往外延伸：JSON 欄位可以存文件式的資料，pgvector 和 PostGIS 這些擴充套件則能處理向量和地圖。大部分專案一輩子都用不到它的極限；真的不夠用時，再把某一類工作搬到別的資料庫也不遲。

## 關聯式資料庫的基本概念

關聯式資料庫把資料存在 **table** 裡。Table 由 **column**（欄位，合起來就是 *schema*）和 **row**（一筆一筆的紀錄）組成。每個 row 都有一個 **primary key**（PK），值不會跟其他 row 重複。像 `7c9e…` 這樣的 UUID 很適合拿來當 primary key，因為 client 離線時就能自己產生，之後送到伺服器也不會撞號。

**Foreign key**（FK）是一個欄位，裡面存的是另一個 row 的 primary key，table 之間就是這樣互相連起來的。一間商店需要四張表：

![Online store tables and their relationships](diagram:ecommerce-erd)

為什麼要拆成好幾張表，而不是做成一張大試算表？如果每筆訂單都直接存顧客的姓名和地址，顧客一搬家，就得改每一筆訂單。有了 `users` 表，訂單只要存 `user_id`，地址只存在一個地方。

表和表之間的關係有兩種。**一對多**：一個使用者有很多筆訂單，但每筆訂單只屬於一個使用者。**多對多**：一筆訂單裡有很多商品，一個商品也會出現在很多筆訂單裡。多對多的關係需要一張 **join table** 來連接，在這裡就是 `order_items`：訂單裡的每一項商品各佔一個 row。

用兩個 statement 就能看懂。第一個建立 join table，第二個查出一筆訂單裡的商品：

```sql
CREATE TABLE order_items (
  id         uuid PRIMARY KEY,
  order_id   uuid NOT NULL REFERENCES orders(id),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity   int  NOT NULL CHECK (quantity > 0)
);

SELECT p.name, i.quantity FROM order_items i
JOIN products p ON p.id = i.product_id WHERE i.order_id = $1;
```

`JOIN` 用 key 把兩張表的 row 接起來。`REFERENCES` 讓資料庫拒絕「指向不存在商品」的訂單項目。`CHECK` 是一種 constraint，也就是由資料庫幫你守的規則：這裡規定數量必須是正數；如果在商品表加上 `CHECK (stock >= 0)`，不管你的程式怎麼寫，庫存都不可能變成負的。萬一 bug 躲過了前面幾層，constraint 就是最後一道防線。

> [!NOTE] 這篇沒有講到的
> 完整的四張表 schema、normalization、索引和 migration，都不在這個系列的範圍內。想再深入，請看你用的資料庫的官方文件。

> [!PRINCIPLE] 核心原則
> 依資料的樣子和讀寫方式，放進不同的儲存。沒有特殊需求的話，PostgreSQL 是常見的預設選擇。
