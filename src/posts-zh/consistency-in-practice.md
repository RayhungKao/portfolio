---
title: "一致性實務：transaction、row lock、isolation level 與 idempotency"
---

**你會學到：** transaction callback 怎麼運作、使用時唯一要守的規則、什麼時候該用 `SELECT … FOR UPDATE`、isolation level 和 deadlock 是什麼，以及怎麼用程式實作 idempotency key。

[Transaction 與同時寫入](/blog/transactions-and-concurrent-writes)替每個問題提供了最簡單的解法，這篇講的是最簡單的解法不夠用的時候。

## Transaction callback

大部分 ORM 都提供一個函式，幫你開啟 transaction、執行你的程式，最後 commit 或 rollback。Prisma 的寫法是傳入一個 callback：

![The transaction function opens, runs your callback, then commits or rolls back](diagram:transaction-callback-commit-rollback)

```ts
const order = await prisma.$transaction(async (tx) => {
  const result = await tx.product.updateMany({
    where: { id: 'p1', stock: { gte: 2 } },
    data: { stock: { decrement: 2 } },
  })
  if (result.count === 0) throw new OutOfStockError() // 丟出錯誤，所有變動都會 rollback

  return tx.order.create({ data: { userId, productId: 'p1', quantity: 2 } })
}) // 正常回傳：COMMIT
```

Callback 正常回傳，transaction 就會 commit。如果丟出錯誤，transaction 就會 rollback，庫存的變動也會跟著那筆沒建立成功的訂單一起取消。

**使用 `tx` 的規則：在 callback 裡一律用 `tx`，絕對不要用外面的 `prisma`。** 外面的 client 用的是另一條資料庫連線，不在這個 transaction 裡。透過它寫入的資料不會被 rollback，其他使用者也會馬上看到，「要嘛全部成功，要嘛全部取消」的保證就在不知不覺中失效了。常見的做法是把 `tx` 當參數傳進輔助函式。

## 必須先讀出來時，用 row lock

有時候你得先讀出一個值、在程式裡判斷，然後才寫回去。兩個請求可能在你讀和寫之間互相穿插。`SELECT … FOR UPDATE` 會把讀到的 row lock 住，直到 transaction 結束，讓第二個請求排在第一個後面等。

```sql
BEGIN;
SELECT stock FROM products WHERE id = 'p1' FOR UPDATE;  -- 其他 transaction 會在這裡等
-- 應用程式在這裡判斷，例如：庫存是 5，訂單要 2
UPDATE products SET stock = stock - 2 WHERE id = 'p1';
COMMIT;                                                  -- 解除 lock
```

`BEGIN` 和 `COMMIT` 之間要做的事越少越好。如果在呼叫金流服務的時候一直握著 lock，所有想用那個 row 的請求都會被擋住。

## Isolation level

Isolation level 決定你的 transaction 能看到多少其他 transaction 做的事。PostgreSQL 預設是 Read Committed。

| 層級 | 你的 transaction 看到什麼 | 還是可能出什麼錯 | 什麼時候用 |
| --- | --- | --- | --- |
| Read Committed（PostgreSQL 預設） | 每個 statement 看到的，是它開始執行前已經 commit 的資料 | 同一個 transaction 裡讀兩次，結果可能不一樣 | 大部分的程式，搭配 atomic 更新和 constraint |
| Repeatable Read | 整個 transaction 都看同一份快照 | 一條牽涉好幾個 row 的規則，還是可能被兩個同時進行的 transaction 打破；如果要更新的 row 已經被另一個 transaction 改過，會發生 serialization failure | 需要一致資料快照的報表 |
| Serializable | 結果就像 transaction 一個接一個執行 | 有些 transaction 會發生 serialization failure，要重試 | 一條牽涉好幾個 row、沒辦法只用一個 statement 守住的規則 |

層級越高，代價越大：速度會變慢，而且 Repeatable Read 和 Serializable 都可能以 PostgreSQL 錯誤碼 `40001` 失敗。遇到時要接住這個錯誤，把整個 transaction 重新跑一次。

## Deadlock

兩個 transaction 各自握著對方需要的 lock 時，就會發生 deadlock。Transaction A 先 lock 了商品 1，接著要商品 2；Transaction B 先 lock 了商品 2，接著要商品 1。兩邊都動不了。PostgreSQL 會發現這個情況，用錯誤碼 `40P01` 中止其中一個，讓另一個完成。

有兩個習慣能減少 deadlock：一是 lock row 的順序要固定，例如一律照商品 id 排序；二是讓 transaction 越短越好。被中止的 transaction，就跟 serialization failure 一樣重試。

## 用程式實作 idempotency key

Client 送出「付款」，伺服器已經 commit 了，回應卻在半路遺失，client 於是重試。如果沒有任何防護，顧客就會被扣兩次錢。

![A retry with the same key returns the stored result](diagram:idempotent-retry-after-lost-response)

Client 替這個要做的動作產生一個 key，每次嘗試都帶著它。伺服器把 key 跟使用者 ID、處理結果一起存起來，並在使用者 ID 加 key 這組值上設 unique constraint。把 key 綁定在使用者身上，一個使用者的 key 就不可能拿到另一個使用者的結果：

```ts
async function chargeOnce(key: string, userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // idempotency_keys 有 UNIQUE (user_id, key)：Prisma schema 裡寫成 @@unique([userId, key])
    const seen = await tx.idempotencyKey.findUnique({ where: { userId_key: { userId, key } } })
    if (seen) return seen.response                      // 是重試：回傳之前存的結果

    const charge = await tx.payment.create({ data: { userId, amount } })
    await tx.idempotencyKey.create({ data: { userId, key, response: charge } })
    return charge
  })
}
```

如果兩個帶著同一個 key 的請求同時進來，兩個都可能通過 `findUnique`。這時 `(user_id, key)` 上的 unique constraint 會讓第二次寫入失敗（Prisma 會回報錯誤 `P2002`），第二個 transaction 連同付款一起 rollback。接住這個錯誤，回應 **409 Conflict**，告訴 client「同一個請求正在處理中」，讓它等一下再重試，而不是看到 500。它下次重試時，就會找到已經存好的結果。舊的 key 過一兩天就可以讓它失效，免得這張表一直變大。

不過 rollback 只能還原你資料庫裡的東西。如果扣款要呼叫 Stripe 這類金流服務，那筆扣款不會跟著你的 transaction 一起 rollback。所以要把同一個 key 放進服務商的 `Idempotency-Key` header 一起送出，這樣重試時，對方會回傳第一次的扣款結果，而不是再扣一次；Stripe 的這個 header，就是把同樣的設計做成服務提供給你。

> [!PRINCIPLE] 核心原則
> 先用最簡單的工具：constraint，不夠再用 atomic 更新，再來是 row lock，最後才是更高的 isolation level。不管用哪一種，都要準備好重試。
