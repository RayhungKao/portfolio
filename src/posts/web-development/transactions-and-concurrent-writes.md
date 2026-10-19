---
title: Transactions and concurrent writes
date: 2026-10-18
summary: How to stop overselling, lost updates and duplicate submissions with the smallest tool that works.
series: web-development
order: 607
part: Backend in practice
draft: true
---

**What you'll learn:** what a transaction guarantees, how overselling and lost updates happen, and the smallest fix for each, including duplicate submissions.

One user at a time is easy. Trouble starts when two requests touch the same data in the same instant, which on a busy site is routine.

## A transaction is all or nothing

A **transaction** groups several writes so that they succeed together or fail together. Placing an order writes the order, its items and the stock change. If the third write fails, the first two are undone, and nobody sees half an order. For the user interface this means a request has only two outcomes: it worked, or it did not.

## Overselling

Two people buy the last item. Each request reads the stock, sees 1, and saves its order.

![Overselling without an atomic update](diagram:oversell-without-atomic-update)

Both reads happened before either write, so stock ends at -1 and two items were sold. Adding a transaction does not help by itself, because both transactions read the same old value.

The fix is to let the database check and change in a single statement:

```sql
UPDATE products SET stock = stock - 2
WHERE id = 'p1' AND stock >= 2;
```

The database changes the row only if the condition still holds, and it reports how many rows it changed. One row means success. Zero rows means somebody else got there first, and the handler answers `409 sold out`.

![An atomic update prevents overselling](diagram:oversell-fixed-with-atomic-update)

## Lost updates and optimistic locking

Now two people edit the same document. Both load it, both change it, and the second save silently overwrites the first. This is a **lost update**.

The fix is the same idea. Store a `version` on the row. A save says "update this row, if its version is still the one I loaded":

```sql
UPDATE files SET content = $1, version = version + 1
WHERE id = $2 AND version = 3;  -- 0 rows changed: reply 409
```

![Optimistic locking with a version number](diagram:optimistic-locking-conflict)

This is called **optimistic locking**: it assumes conflicts are rare and checks only at save time. When it does conflict, the client gets a `409` and can show a dialog to reload, merge or overwrite.

Why not simply lock the row in the database while a user edits? A database lock is meant to last milliseconds. A person editing for ten minutes would block everyone else and tie up a connection the whole time.

Other approaches exist, each with a price:

- **Check-out:** one person locks a file, the others wait. SharePoint offers this for documents.
- **Real-time merge:** edits from several people are combined as they happen. Google Docs and Figma do this, using algorithms called OT or CRDT, and it is a big engineering effort.

## Duplicate submissions

A user double-clicks "Pay", or the phone retries a request whose answer got lost. The server then receives the same request twice.

Some actions are naturally safe to repeat. Deleting a file is one of them:

```sql
DELETE FROM files WHERE id = $1 AND owner_id = $2;
```

The second time, zero rows are deleted, which means the work is already done, and the handler can still answer success.

Creating an order or charging a card is not safe to repeat. For those the client sends an **idempotency key**, a unique value generated once per intended action. The server remembers the keys it has handled and returns the earlier result for a repeat. Stripe's `Idempotency-Key` header works this way.

## When one statement is not enough

Start with the smallest tool and move up only when you must:

1. A `CHECK` or `UNIQUE` constraint, so the database refuses bad data outright.
2. A single atomic `UPDATE`, as above.
3. A row lock, with `SELECT … FOR UPDATE`, when you must read, think, and then write.
4. The `SERIALIZABLE` isolation level, when a rule spans several rows.

Each step costs more speed and more care than the one before it.

> [!NOTE] Where the rest lives
> Transaction callbacks, row-lock SQL, isolation levels, deadlocks and idempotency code are in the deep dive [Consistency in practice](/blog/consistency-in-practice).

> [!PRINCIPLE] Core principle
> Whatever a single statement or a constraint can solve, do not introduce locks.
