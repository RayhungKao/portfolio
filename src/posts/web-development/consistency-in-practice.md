---
title: "Consistency in practice: transactions, row locks, isolation levels and idempotency"
date: 2026-10-18
summary: "How a transaction callback commits or rolls back, when to use a row lock, what isolation levels change, and how an idempotency key survives a lost response."
series: web-development
order: 904
part: Parked for a later series
draft: true
---

**What you'll learn:** how a transaction callback works and its one rule, when `SELECT … FOR UPDATE` is the right tool, what isolation levels and deadlocks mean, and how to code an idempotency key.

[Transactions and concurrent writes](/blog/transactions-and-concurrent-writes) gives the smallest fix for each problem. This article is for the cases where the smallest fix is not enough.

## The transaction callback

Most ORMs offer a function that opens a transaction, runs your code, and commits or rolls back for you. Prisma's version takes a callback:

![The transaction function opens, runs your callback, then commits or rolls back](diagram:transaction-callback-commit-rollback)

```ts
const order = await prisma.$transaction(async (tx) => {
  const result = await tx.product.updateMany({
    where: { id: 'p1', stock: { gte: 2 } },
    data: { stock: { decrement: 2 } },
  })
  if (result.count === 0) throw new OutOfStockError() // throwing rolls everything back

  return tx.order.create({ data: { userId, productId: 'p1', quantity: 2 } })
}) // returned normally: COMMIT
```

If the callback returns, the transaction commits. If it throws, the transaction rolls back, so the stock change disappears along with the order that never got created.

**The `tx` rule: inside the callback, use `tx`, never the outer `prisma`.** The outer client talks to the database on a different connection, outside the transaction. A write made through it is not rolled back and is not hidden from other users, so the all-or-nothing promise quietly breaks. Passing `tx` down into helper functions is the usual way to keep this rule.

## A row lock, when you must read first

Sometimes you must read a value, make a decision in code, and then write. Two requests can interleave between the read and the write. `SELECT … FOR UPDATE` locks the rows it reads until the transaction ends, so the second request waits for the first.

```sql
BEGIN;
SELECT stock FROM products WHERE id = 'p1' FOR UPDATE;  -- other transactions wait here
-- the application decides, for example: stock is 5 and the order wants 2
UPDATE products SET stock = stock - 2 WHERE id = 'p1';
COMMIT;                                                  -- the lock is released
```

Keep the work between `BEGIN` and `COMMIT` short. A lock held while you call a payment provider blocks everyone else who wants that row.

## Isolation levels

An isolation level says how much of other transactions' work yours can see. PostgreSQL's default is Read Committed.

| Level | What your transaction sees | What can still go wrong | When to use it |
| --- | --- | --- | --- |
| Read Committed (PostgreSQL's default) | Each statement sees data committed before that statement began | Two reads in one transaction can return different values | Most code, together with atomic updates and constraints |
| Repeatable Read | One snapshot for the whole transaction | A rule that spans several rows can still be broken by two concurrent transactions | Reports that must see a consistent snapshot |
| Serializable | As if transactions ran one after another | Some transactions fail with a serialization error and must be retried | A rule across several rows that no single statement can enforce |

A higher level is not free: it costs speed, and Serializable requires you to catch the failure (PostgreSQL error code `40001`) and run the whole transaction again.

## Deadlocks

A deadlock happens when two transactions each hold a lock the other needs. Transaction A locks product 1 and then wants product 2. Transaction B locks product 2 and then wants product 1. Neither can go on. PostgreSQL notices, aborts one of them with error `40P01` and lets the other finish.

Two habits reduce them. Lock rows in a consistent order, for example always sorted by product id. And keep transactions short. The aborted transaction should be retried, like a serialization failure.

## Idempotency keys in code

A client sends "Pay", the server commits, and the response is lost. The client retries. Without protection the customer pays twice.

![A retry with the same key returns the stored result](diagram:idempotent-retry-after-lost-response)

The client creates one key for the intended action and sends it with every attempt. The server stores the key and the result under a unique constraint:

```ts
async function chargeOnce(key: string, userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // idempotency_keys.key has a UNIQUE constraint
    const seen = await tx.idempotencyKey.findUnique({ where: { key } })
    if (seen) return seen.response                      // a retry: return the stored result

    const charge = await tx.payment.create({ data: { userId, amount } })
    await tx.idempotencyKey.create({ data: { key, response: charge } })
    return charge
  })
}
```

Two requests carrying the same key at the same moment can both pass the `findUnique`. The unique constraint on `key` makes the second insert fail, its transaction rolls back, and the client's next retry then finds the stored result. Expire old keys after a day or two so the table does not grow forever. Stripe's `Idempotency-Key` header is the same design offered as a service.

> [!PRINCIPLE] Core principle
> Reach for the smallest tool first: a constraint, then an atomic update, then a row lock, then a higher isolation level. Whatever you choose, be ready to retry.
