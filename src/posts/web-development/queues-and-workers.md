---
title: "Queues and workers: doing slow work after the response"
date: 2026-10-18
summary: "A queue lets a request finish quickly while a worker does the slow job, with retries, dead letters and idempotent jobs."
series: web-development
order: 701
part: Deep dives
draft: false
---

**What you'll learn:** how a queue and a worker split slow work from the request, what happens when a job fails, and how this differs from a Web Worker in the browser.

Some work does not belong inside a request: sending an email, resizing an image, building a report, charging a card through a slow provider. If the handler does it inline, the user waits, and a failure halfway through is lost. A **queue** and a **worker** fix both problems.

## Two kinds of worker

The word "worker" means different things in the browser and on the server.

| | Web Worker (browser) | Backend worker |
| --- | --- | --- |
| Where it runs | A background thread in the user's browser | A process on your server or a platform |
| What it solves | The page freezes during heavy computing | A request would take too long, or must survive a crash |
| What it receives | Messages from the page, through `postMessage` | Jobs taken from a queue |
| Example | Parsing a 50 MB file without freezing the screen | Sending a receipt email after checkout |

The browser one is covered in [Browser workers in practice](/blog/browser-workers-in-practice). The rest of this article is about the backend one.

## The shape

![A queue lets the web request finish before the slow work starts](diagram:queue-and-worker-flow)

The API saves the order, adds a job to the queue and answers at once. A worker takes jobs from the queue and does the slow part. The queue is where jobs wait, so it also absorbs a burst: a thousand orders in a minute become a thousand jobs, worked off at the pace the worker can manage.

## A minimal example

BullMQ is a common Node library that keeps its queue in Redis. The API side adds a job and returns:

```ts
// api: the request only enqueues
import { Queue } from 'bullmq'

const emails = new Queue('emails', { connection: { host: 'localhost', port: 6379 } })

export async function POST(request: Request) {
  const order = await createOrder(await request.json())
  await emails.add(
    'receipt',
    { orderId: order.id },
    { attempts: 5, backoff: { type: 'exponential', delay: 2000 } }, // retry: 2s, 4s, 8s...
  )
  return Response.json(order, { status: 201 }) // answered before the email exists
}
```

The worker is a separate process:

```ts
// worker: a long-running process, started on its own
import { Worker } from 'bullmq'

new Worker(
  'emails',
  async (job) => {
    const order = await loadOrder(job.data.orderId)
    await sendReceipt(order) // if this throws, the job is retried
  },
  { connection: { host: 'localhost', port: 6379 } },
)
```

## When a job fails

Networks fail, providers time out, code has bugs. A queue gives each failure a place to go:

- **Retry with backoff.** The job goes back to the queue and waits longer each time, so a struggling provider is not hammered.
- **Dead-letter queue.** After the last retry, the job moves to a separate queue. Nothing is silently lost, and a person can look at it, fix the cause and replay it.
- **Visibility timeout.** On queues such as Amazon SQS, a job being worked on is hidden from other workers for a while. If the worker dies and never confirms, the job reappears.

## Jobs must be safe to run twice

Most queues promise **at least once** delivery, not exactly once. A worker can finish the work and crash before it confirms, so the job runs again. The job therefore has to be **idempotent**: running it twice must have the same effect as running it once. Send the receipt only if `order.receiptSentAt` is empty, or pass an idempotency key to the email provider. This is the same idea as the duplicate submissions in [Transactions and concurrent writes](/blog/transactions-and-concurrent-writes), applied to jobs.

## Choosing one

| Option | What it is | Fits |
| --- | --- | --- |
| BullMQ | A library on top of Redis; you run the worker | A Node service on a VPS or container platform |
| Amazon SQS | A managed queue; you write the consumer | A system already on AWS |
| Cloud Tasks | A managed queue on Google Cloud that calls an HTTP endpoint | A GCP app that wants jobs to arrive as HTTP calls |
| Inngest, Trigger.dev | Hosted job services that run your functions step by step | A serverless app that needs jobs longer than a function's time limit |

On serverless there is no long-running process to hold a worker, and a function has a time limit. As of October 2026, hosted services such as Inngest and Trigger.dev exist for exactly this case: a function triggers the job, and the service runs it with retries outside the time limit. Check their current limits before you depend on them.

## When you do not need one

If the work takes a few hundred milliseconds and failing it is harmless to repeat, do it inline. A queue adds a store to run, a process to deploy and a new class of bugs (duplicates, ordering). Add it when a request is too slow, or when a lost job costs money.

> [!PRINCIPLE] Core principle
> A queue separates "accepted" from "done". Give every job retries, a dead-letter place and idempotency, because it will run more than once.
