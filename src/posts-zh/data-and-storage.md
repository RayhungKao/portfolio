---
title: 資料與儲存
---

**你會學到：** 後端會用到的三種儲存、七種資料庫的地圖，以及足以看懂一份資料表設計的關聯式資料庫詞彙。

後端不會把所有東西放在同一個地方。它會依照資料的形狀和存取方式，把每一份資料放到最適合的地方。

![Three kinds of storage behind a backend](diagram:three-kinds-of-storage)

| 儲存 | 放什麼 | 為什麼適合 | 例子 |
| --- | --- | --- | --- |
| 資料庫 | 要查詢、不能遺失的結構化資料 | 查詢、關聯和 constraint | PostgreSQL 裡的使用者、訂單和庫存。 |
| 快取 | 可以重新計算的暫時資料 | 從記憶體讀取，非常快，遺失也沒關係 | Redis 裡的登入 session 和「熱銷前 10 名」清單。 |
| 物件儲存 | 整個讀取的大型檔案 | 便宜、容量大、用 URL 提供 | S3 裡的商品照片和上傳的影片。 |

判斷快取的方法很簡單：如果它明天消失了，你能重建嗎？如果不能，它就該放在資料庫。

## 七種資料庫

「資料庫」涵蓋好幾種不同的工具，每一種都是圍繞某種資料形狀打造的。

| 類型 | 資料形狀 | 產品 | 情境 |
| --- | --- | --- | --- |
| 關聯式 | 由彼此參照的 row 組成的表格 | PostgreSQL、MySQL | 訂單、顧客、商品。 |
| 文件式 | 巢狀、類似 JSON 的紀錄 | MongoDB、Firestore | 訊息欄位不固定的手機聊天 App。 |
| Key-value | 一個 key 對一個值，非常快 | Redis、DynamoDB | Session store、rate limit 計數器。 |
| 搜尋 | 依相關性排序的文字 | Elasticsearch、Meilisearch | 能容忍錯字的搜尋框。 |
| 時間序列 | 依時間排序的量測值 | TimescaleDB、InfluxDB | 伺服器指標、感測器讀數。 |
| 圖 | 項目以及它們之間的連結 | Neo4j | 「朋友的朋友」推薦。 |
| 向量 | 描述語意的一串數字 | pgvector、Pinecone | 替 AI 助理找出相似的文件。 |

## 為什麼 PostgreSQL 通常是預設選擇

如果你的需求沒有什麼特別，就從 PostgreSQL 開始。很多團隊把它當成新網頁專案的預設，理由很實際。它是關聯式的，能處理大多數 App 都有的結構化資料。它有很強的 transaction 能力，下一篇會談到。它也能橫向延伸：JSON 欄位涵蓋文件式資料，pgvector 和 PostGIS 等擴充套件則涵蓋向量和地圖。大多數專案永遠不會超出它的能力；真的超出了，之後也可以把某一種工作負載搬出去。

## 關聯式基礎

關聯式資料庫把資料存在 **table** 裡。Table 有 **column**（欄位，也就是 *schema*）和 **row**（每個 row 一筆紀錄）。每個 row 都有一個 **primary key**（PK），是它獨有的值。像 `7c9e…` 這樣的 UUID 是很好的選擇，因為用戶端在離線時就能產生，之後伺服器接收時也不會撞號。

**Foreign key**（FK）是存放另一個 row 的 primary key 的欄位，table 就是這樣互相指向的。一間商店需要四張表：

![Online store tables and their relationships](diagram:ecommerce-erd)

為什麼要拆成好幾張表，而不是一張大試算表？如果每筆訂單都存顧客的姓名和地址，換地址就得修改每一筆訂單。有了 `users` 表，訂單只存 `user_id`，地址只存在一個地方。

關係有兩種。**一對多**：一個使用者有很多筆訂單，每筆訂單屬於一個使用者。**多對多**：一筆訂單包含很多商品，一個商品也出現在很多筆訂單裡。多對多的連結需要一張 **join table**，在這裡就是 `order_items`，訂單裡的每個商品一個 row。

兩個 statement 就能說明這個概念。第一個建立 join table，第二個讀出一筆訂單和它的商品：

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

`JOIN` 透過鍵把兩張表的 row 接在一起。`REFERENCES` 讓資料庫拒絕指向不存在商品的訂單項目。`CHECK` 是一種 constraint，也就是資料庫替你執行的規則：數量必須是正數；在商品表上，`CHECK (stock >= 0)` 表示不管你的程式做了什麼，庫存都不可能變成負數。當 bug 溜過上面幾層時，constraint 就是最後一道防線。

> [!NOTE] 這裡沒有涵蓋
> 完整的四張表 schema、normalization、索引和 migration 都超出這個系列的範圍。下一步請看你所用資料庫的官方文件。

> [!PRINCIPLE] 核心原則
> 資料依形狀和存取方式放進不同的儲存。沒有特殊需求時，PostgreSQL 是常見的預設選擇。
