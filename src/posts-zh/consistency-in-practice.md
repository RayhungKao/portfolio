---
title: "一致性實務：交易、列鎖、隔離層級與冪等性"
---

**你會學到：** 交易 callback 怎麼運作、它唯一的規則、什麼時候 `SELECT … FOR UPDATE` 是對的工具、隔離層級和死結是什麼意思，以及怎麼寫出 idempotency key。

[交易與並行寫入](/blog/transactions-and-concurrent-writes)替每個問題給出最小的解法。這篇談的是最小解法不夠用的情況。

## 交易 callback

大多數 ORM 都提供一個函式，替你開啟交易、執行你的程式，再 commit 或 rollback。Prisma 的版本接收一個 callback：

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

Callback 正常回傳，交易就 commit。如果它丟出錯誤，交易就 rollback，庫存的變動會和那張沒建立成功的訂單一起消失。

**`tx` 規則：在 callback 裡用 `tx`，絕對不要用外面的 `prisma`。** 外面的 client 透過另一條連線和資料庫溝通，位在交易之外。透過它做的寫入不會被 rollback，也不會對其他使用者隱藏，於是「全有或全無」的承諾就默默破功了。把 `tx` 傳進輔助函式是遵守這條規則的常見做法。

## 必須先讀時，用列鎖

有時你必須讀一個值、在程式裡做決定，然後再寫入。兩個請求可能在讀和寫之間交錯。`SELECT … FOR UPDATE` 會把讀到的列鎖到交易結束，讓第二個請求等第一個。

```sql
BEGIN;
SELECT stock FROM products WHERE id = 'p1' FOR UPDATE;  -- 其他交易在這裡等待
-- 應用程式做決定，例如：庫存是 5，訂單要 2
UPDATE products SET stock = stock - 2 WHERE id = 'p1';
COMMIT;                                                  -- 釋放鎖
```

讓 `BEGIN` 和 `COMMIT` 之間的工作保持簡短。在呼叫金流服務時一直握著鎖，會擋住所有想要那一列的人。

## 隔離層級

隔離層級說明你的交易能看到多少其他交易的工作。PostgreSQL 的預設是 Read Committed。

| 層級 | 你的交易看到什麼 | 還可能出什麼錯 | 什麼時候用 |
| --- | --- | --- | --- |
| Read Committed（PostgreSQL 預設） | 每個敘述看到的是該敘述開始前已 commit 的資料 | 同一個交易裡的兩次讀取可能回傳不同的值 | 大部分程式，搭配原子更新和約束 |
| Repeatable Read | 整個交易使用同一份快照 | 一條橫跨多列的規則，仍可能被兩個並行交易打破；更新一列被另一個交易改過的資料會因序列化錯誤而失敗 | 必須看到一致快照的報表 |
| Serializable | 就像交易一個接一個執行 | 有些交易會因序列化錯誤而失敗，必須重試 | 一條橫跨多列、沒有任何單一敘述能強制執行的規則 |

較高的層級不是免費的：它會犧牲速度，而且 Repeatable Read 和 Serializable 都可能以 PostgreSQL 錯誤碼 `40001` 失敗。攔下它，然後把整個交易重跑一次。

## 死結

當兩個交易各自握著對方需要的鎖時，就會發生死結（deadlock）。交易 A 鎖住商品 1，然後想要商品 2。交易 B 鎖住商品 2，然後想要商品 1。兩邊都無法繼續。PostgreSQL 會察覺，以錯誤 `40P01` 中止其中一個，讓另一個完成。

有兩個習慣能減少死結。用一致的順序鎖定列，例如永遠依商品 id 排序。並讓交易保持簡短。被中止的交易應該像序列化失敗一樣重試。

## 用程式寫出 idempotency key

用戶端送出「付款」，伺服器 commit 了，回應卻遺失了。用戶端重試。沒有保護的話，顧客就付了兩次錢。

![A retry with the same key returns the stored result](diagram:idempotent-retry-after-lost-response)

用戶端為預期的動作產生一個 key，每次嘗試都帶上它。伺服器在 unique 約束之下儲存這個 key 和結果：

```ts
async function chargeOnce(key: string, userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // idempotency_keys.key 有 UNIQUE 約束
    const seen = await tx.idempotencyKey.findUnique({ where: { key } })
    if (seen) return seen.response                      // 重試：回傳儲存的結果

    const charge = await tx.payment.create({ data: { userId, amount } })
    await tx.idempotencyKey.create({ data: { key, response: charge } })
    return charge
  })
}
```

兩個帶著同一個 key、在同一瞬間抵達的請求，可能都通過 `findUnique`。`key` 上的 unique 約束會讓第二次插入失敗（Prisma 回報為錯誤 `P2002`），它的交易連同付款一起 rollback。攔下這個錯誤並回應 **409 Conflict**，附上「同一個請求正在處理中」，讓用戶端等一下再重試，而不是看到 500。它下一次重試就會找到儲存的結果。一兩天後讓舊的 key 過期，免得這張表無限增長。

Rollback 只保護存在你資料庫裡的東西。如果扣款意味著呼叫 Stripe 這類金流服務，那筆扣款無法隨你的交易一起 rollback。把同一個 key 當作供應商的 `Idempotency-Key` header 送出，讓重試的呼叫回傳第一筆扣款，而不是再扣一次；Stripe 的 header 就是把這個同樣的設計做成服務提供出來。

> [!PRINCIPLE] 核心原則
> 先拿最小的工具：約束，然後原子更新，然後列鎖，然後更高的隔離層級。不管選哪一個，都要準備好重試。
