---
title: "一致性實務：transaction、row lock、isolation level 與 idempotency"
---

**你會學到：** transaction callback 怎麼運作、它唯一的規則、什麼時候 `SELECT … FOR UPDATE` 是對的工具、isolation level 和 deadlock 是什麼意思，以及怎麼寫出 idempotency key。

[transaction 與並行寫入](/blog/transactions-and-concurrent-writes)替每個問題給出最小的解法。這篇談的是最小解法不夠用的情況。

## Transaction callback

大多數 ORM 都提供一個函式，替你開啟 transaction、執行你的程式，再 commit 或 rollback。Prisma 的版本接收一個 callback：

![The transaction function opens, runs your callback, then commits or rolls back](diagram:transaction-callback-commit-rollback)

```ts
const order = await prisma.$transaction(async (tx) => {
  const result = await tx.product.updateMany({
    where: { id: 'p1', stock: { gte: 2 } },
    data: { stock: { decrement: 2 } },
  })
  if (result.count === 0) throw new OutOfStockError() // 丟出錯誤會讓一切 rollback

  return tx.order.create({ data: { userId, productId: 'p1', quantity: 2 } })
}) // 正常回傳：COMMIT
```

Callback 正常回傳，transaction 就 commit。如果它丟出錯誤，transaction 就 rollback，庫存的變動會和那張沒建立成功的訂單一起消失。

**`tx` 規則：在 callback 裡用 `tx`，絕對不要用外面的 `prisma`。** 外面的 client 透過另一條連線和資料庫溝通，位在 transaction 之外。透過它做的寫入不會被 rollback，也不會對其他使用者隱藏，於是「全有或全無」的承諾就默默破功了。把 `tx` 傳進輔助函式是遵守這條規則的常見做法。

## 必須先讀時，用 row lock

有時你必須讀一個值、在程式裡做決定，然後再寫入。兩個請求可能在讀和寫之間交錯。`SELECT … FOR UPDATE` 會把讀到的 row lock 住，直到 transaction 結束，讓第二個請求等第一個。

```sql
BEGIN;
SELECT stock FROM products WHERE id = 'p1' FOR UPDATE;  -- 其他 transaction 在這裡等待
-- 應用程式做決定，例如：庫存是 5，訂單要 2
UPDATE products SET stock = stock - 2 WHERE id = 'p1';
COMMIT;                                                  -- 釋放 lock
```

讓 `BEGIN` 和 `COMMIT` 之間的工作保持簡短。在呼叫金流服務時一直握著 lock，會擋住所有想要那個 row 的人。

## Isolation level

Isolation level 說明你的 transaction 能看到多少其他 transaction 的工作。PostgreSQL 的預設是 Read Committed。

| 層級 | 你的 transaction 看到什麼 | 還可能出什麼錯 | 什麼時候用 |
| --- | --- | --- | --- |
| Read Committed（PostgreSQL 預設） | 每個 statement 看到的是該 statement 開始前已 commit 的資料 | 同一個 transaction 裡的兩次讀取可能回傳不同的值 | 大部分程式，搭配 atomic 更新和 constraint |
| Repeatable Read | 整個 transaction 使用同一份快照 | 一條橫跨多個 row 的規則，仍可能被兩個並行 transaction 打破；更新一個已被另一個 transaction 改過的 row，會因 serialization failure 而失敗 | 必須看到一致快照的報表 |
| Serializable | 就像 transaction 一個接一個執行 | 有些 transaction 會因 serialization failure 而失敗，必須重試 | 一條橫跨多個 row、沒有任何單一 statement 能強制執行的規則 |

較高的層級不是免費的：它會犧牲速度，而且 Repeatable Read 和 Serializable 都可能以 PostgreSQL 錯誤碼 `40001` 失敗。攔下它，然後把整個 transaction 重跑一次。

## Deadlock

當兩個 transaction 各自握著對方需要的 lock 時，就會發生 deadlock。Transaction A lock 商品 1，然後想要商品 2。Transaction B lock 商品 2，然後想要商品 1。兩邊都無法繼續。PostgreSQL 會察覺，以錯誤 `40P01` 中止其中一個，讓另一個完成。

有兩個習慣能減少 deadlock。用一致的順序 lock row，例如永遠依商品 id 排序。並讓 transaction 保持簡短。被中止的 transaction 應該像 serialization failure 一樣重試。

## 用程式寫出 idempotency key

用戶端送出「付款」，伺服器 commit 了，回應卻遺失了。用戶端重試。沒有保護的話，顧客就付了兩次錢。

![A retry with the same key returns the stored result](diagram:idempotent-retry-after-lost-response)

用戶端為預期的動作產生一個 key，每次嘗試都帶上它。伺服器把這個 key 和使用者 ID 一起存下，連同結果，並在這一組值上設 unique constraint。把 key 限定在使用者底下，一個使用者的 key 就永遠拿不到另一個使用者的結果：

```ts
async function chargeOnce(key: string, userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // idempotency_keys 有 UNIQUE (user_id, key)：Prisma schema 裡寫成 @@unique([userId, key])
    const seen = await tx.idempotencyKey.findUnique({ where: { userId_key: { userId, key } } })
    if (seen) return seen.response                      // 重試：回傳儲存的結果

    const charge = await tx.payment.create({ data: { userId, amount } })
    await tx.idempotencyKey.create({ data: { userId, key, response: charge } })
    return charge
  })
}
```

兩個帶著同一個 key、在同一瞬間抵達的請求，可能都通過 `findUnique`。`(user_id, key)` 上的 unique constraint 會讓第二次插入失敗（Prisma 回報為錯誤 `P2002`），它的 transaction 連同付款一起 rollback。攔下這個錯誤並回應 **409 Conflict**，附上「同一個請求正在處理中」，讓用戶端等一下再重試，而不是看到 500。它下一次重試就會找到儲存的結果。一兩天後讓舊的 key 過期，免得這張表無限增長。

Rollback 只保護存在你資料庫裡的東西。如果扣款意味著呼叫 Stripe 這類金流服務，那筆扣款無法隨你的 transaction 一起 rollback。把同一個 key 當作供應商的 `Idempotency-Key` header 送出，讓重試的呼叫回傳第一筆扣款，而不是再扣一次；Stripe 的 header 就是把這個同樣的設計做成服務提供出來。

> [!PRINCIPLE] 核心原則
> 先拿最小的工具：constraint，然後 atomic 更新，然後 row lock，然後更高的 isolation level。不管選哪一個，都要準備好重試。
