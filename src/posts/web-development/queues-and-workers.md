---
title: "Queues and workers: moving work out of the request"
date: 2026-10-18
summary: "When work should not run inside the request that caused it, a queue holds it and a worker does it. The situations that call for one, the design questions that follow (lost jobs, failures, duplicates), and how to tell the kinds of queue apart."
series: web-backend
order: 301
part: Growing the backend
draft: false
---

**What you'll learn:** which situations call for a queue and a worker, how they split slow work from the request, how a job can get lost between your database and the queue, what happens when a job fails, and how to choose a tool by what one job is and who reads it.

Some work should not run inside the request that caused it. A **queue** holds that work as jobs, and a **worker**, a separate process, takes the jobs and does them. The request answers without waiting for the work, and a job that fails halfway is retried instead of lost.

("Worker" also names the Web Worker in the browser, a different thing: see [Browser workers](/blog/browser-workers-boundaries). This article is about the backend kind.)

## When you need one

- **Asynchronous processing.** Sending a receipt, resizing an image, building a report: the user gets an answer at once and the work finishes a few seconds later. A video conversion takes minutes, longer than a proxy waits or a serverless function may run (Vercel: 300 to 800 seconds); a worker has no such limit.
- **Decoupling.** The order service records the order and leaves a message. Inventory and shipping each read it at their own pace, and orders still go through while shipping is down for an hour.
- **Load leveling (peak shaving).** A ticket sale brings 2,000 orders in a minute. The queue holds them and the workers go through them at a steady pace, so the database and any provider with a rate limit (an email or SMS API that accepts only so many calls per second) see a flat load instead of the peak. Workers run on their own machines and scale apart from the web servers.

The rest of this article follows the first case. The same parts apply to all of them: a queue that keeps jobs, a worker that takes them, retries, and jobs that are safe to run twice.

## The shape

![A queue lets the web request finish before the slow work starts](diagram:queue-and-worker-flow)

The server saves the order, adds a job to the queue and answers at once. A worker takes jobs from the queue and does the slow part. The queue is where jobs wait, so it also absorbs a burst: a thousand orders in a minute become a thousand jobs, worked off at the pace the worker can manage.

In code, the request side is only this (BullMQ, a Node library that keeps its jobs in Redis):

```ts
await emails.add('receipt', { orderId: order.id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } })
return Response.json(order, { status: 201 }) // answered before the email exists
```

The worker is a separate, long-running process that receives each job and calls `sendReceipt`. If it throws, the job is retried after 2, 4, 8 seconds and so on.

## Saving and enqueueing are two writes

The server writes to the database and then to the queue. These are two systems, so no transaction covers both. If the process crashes between them, the order exists and the job does not, and no receipt is ever sent. Swapping the order does not help: a job added first may run before the order is saved, or the save may fail and leave a job for an order that never existed. This is the **dual-write problem**.

| Fix | How it works (example) | What you give up |
| --- | --- | --- |
| Outbox | Write "send receipt for order 42" into an `outbox` table in the same transaction as the order. A relay reads unsent rows, enqueues them and marks them sent. | You run a relay. If it crashes before marking a row, the row is sent again, so give each job a stable id: BullMQ ignores an add whose `jobId` already exists. |
| Queue in the same database | A queue that lives in PostgreSQL creates the job inside your transaction, so order and job share one `COMMIT`. pg-boss supports this, with adapters for Drizzle, Knex, Kysely and Prisma. | Job traffic shares the database with your application data. |

Neither fix makes a job run exactly once, which is the next section.

## When a job fails

Networks fail, providers time out, code has bugs. A queue gives each failure a place to go:

- **Retry with backoff.** The job goes back to the queue and waits longer each time, so a struggling provider is not hammered.
- **Dead-letter queue.** After the last retry, the job moves to a separate queue, where a person can look at it, fix the cause and replay it. Whether you get one depends on the tool. Amazon SQS and pg-boss have one. BullMQ keeps an exhausted job in a "failed" set, and you decide how long to keep it and who looks at it. Google Cloud Tasks deletes a task after its last retry.
- **Visibility timeout.** On queues such as Amazon SQS, a job being worked on is hidden from other workers for a while. If the worker dies and never confirms, the job reappears.

## Jobs must be safe to run twice

Most queues promise **at least once** delivery, not exactly once. A worker can finish the work and crash before it confirms, so the job runs again. The job therefore has to be **idempotent**: running it twice must have the same effect as running it once. Send the receipt only if `order.receiptSentAt` is empty, or pass an idempotency key to the email provider. This is the same idea as the duplicate submissions in [Transactions and concurrent writes](/blog/transactions-and-concurrent-writes), applied to jobs.

## Choosing one

The tools look alike, but the key difference between them is **what one job is and who reads it**. Answer these in order:

1. **Does one job have several steps that wait (hours, days, a person) and must resume after a crash?** Use a durable workflow: Inngest, Trigger.dev or Temporal.
2. **Is the message for other services rather than your own worker?** Use a message broker or a cloud queue: RabbitMQ to route messages between services, or Amazon SQS on AWS. If several consumers each need to read the same stream, or replay it, that is Kafka (below the table).
3. **Otherwise it is a job for your own app.** Use a job queue library and pick it by the store you already run: pg-boss or Graphile Worker when your data is in PostgreSQL and the job must commit with it, BullMQ when you already run Redis, Agenda when the work is mostly scheduled. On a cloud, if you want nothing of your own to run, Amazon SQS or Google Cloud Tasks does the same job.

Details were checked against each project's own documentation in October 2026.

| Kind | Option | Pick it when (example) | What you give up |
| --- | --- | --- | --- |
| Job queue library (Redis) | BullMQ | You want a full-featured Node library (retries, delayed and repeatable jobs, priorities) and already run Redis. E.g. receipt emails. | Redis needs `noeviction` and, per BullMQ, AOF persistence. No dead-letter queue. |
| Job queue library (PostgreSQL) | pg-boss, Graphile Worker | Your data is in PostgreSQL and a job should commit with it. pg-boss adds dead-letter queues and cron; Graphile Worker is the Node-and-PostgreSQL alternative with retries and scheduled jobs. E.g. an order and its receipt job in one transaction. | Jobs share your application database. |
| Scheduling library (MongoDB, PostgreSQL or Redis) | Agenda (v6) | The work is mostly scheduled: cron or readable intervals, timezones, priorities. E.g. a report at 2 a.m. every night. | Choose it for the scheduling features: version 6 supports all three stores, so the database you already run does not decide. |
| Message broker | RabbitMQ | Several services need routing rules between them. E.g. an order service telling inventory and shipping. | You run the broker. Dead-lettered messages are re-published without publisher confirms by default, so one can be lost; quorum queues support at-least-once dead-lettering. |
| Cloud queue (AWS) | Amazon SQS | You are on AWS and want no broker to run: visibility timeout, dead-letter queue after `maxReceiveCount`, at-least-once on standard queues. E.g. thumbnail jobs. | You write and run the consumer. AWS warns that a dead-letter queue on a FIFO queue can break message order. |
| Cloud queue (Google Cloud) | Cloud Tasks | You are on Google Cloud and want jobs delivered as HTTP requests to your endpoint, at a rate you set. E.g. a Cloud Run endpoint that builds PDFs. | A task is deleted after its last retry. The endpoint must answer within its deadline (10 minutes by default, 30 at most). |
| Durable workflow | Inngest, Trigger.dev, Temporal | Work that outlives a request or a crash and should resume from the last finished step. Inngest: steps whose results are saved, e.g. sign up, wait three days, send an onboarding email. Trigger.dev: long tasks with a `maxDuration` (compute time per attempt, waiting not counted), e.g. a video conversion. Temporal: workflows whose every step is recorded in an event history, e.g. a loan approval that waits for people. | Inngest: each step runs as a request to your app, so it must fit your host's time limit. Trigger.dev: self-hosting lacks checkpoints and auto-scaling. Temporal: you run the workers either way, and the server too (Go plus a database) unless you use Temporal Cloud. |

"Durable" means progress is saved, so after a crash the work continues from the last finished step instead of starting over.

Kafka is not in the table because it is a different tool: a log that several consumers read independently or replay, e.g. one click stream feeding analytics and fraud checks. Retries, delays and dead letters are left to you; Kafka 4.2's share groups add per-message acknowledgement, but only for Java clients. For "send this email later" you would take on a distributed log to get what the rows above give you for free.

## When you do not need one

If the work takes a few hundred milliseconds and repeating it is harmless, do it inline. A queue adds a store to run, a process to deploy and a new class of bugs (duplicates, ordering). Add it when a request is too slow, or when a lost job costs money.

> [!PRINCIPLE] Core principle
> A queue separates "accepted" from "done". Make sure a job cannot be lost between your database and the queue, and give every job retries, a dead-letter place and idempotency, because it will run more than once.
