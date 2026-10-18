---
title: Mixed scenarios and when to change
date: 2026-10-18
summary: Five real setups with a reason for every choice, and the signals that tell you it is time to change one of them.
series: web-development
order: 610
part: Backend
draft: true
---

**What you'll learn:** how real projects combine services, why each cell in five example setups was chosen, and which signals tell you to change a choice.

Real projects rarely match one bundle. A subscription app might use a hosted login, a serverless database, a payment provider and a worker for long jobs, each chosen for its own reason. Two examples show how the pieces connect before we look at five whole setups.

## A subscription SaaS, built from parts

![A subscription SaaS built from mixed parts](diagram:saas-hub-diagram)

Next.js on Vercel sits in the centre. Clerk handles sign-in, and Next.js verifies the session it issues. Data goes to a PostgreSQL database on Neon. Stripe reports payments by calling a webhook on the Next.js side. A long report is too slow for a function, so Next.js hands it to Inngest, which runs it on a worker at Fly.io, and the worker saves the finished report to the database.

The Stripe webhook shows why the pieces need care. Stripe calls your URL when a payment succeeds, and it will call again if your answer is slow or fails. The same event can therefore arrive twice, and the handler must not mark the subscription paid twice.

```ts
// app/api/stripe/webhook/route.ts
export async function POST(request: Request) {
  const event = await verifyStripeSignature(request)    // reject forged calls
  await db.transaction(async (tx) => {
    const fresh = await tx.insertProcessedEvent(event.id) // PRIMARY KEY on event id
    if (!fresh) return                                    // seen before: skip
    await tx.markSubscriptionPaid(event.data.object)
  })
  return new Response('ok')
}
```

Three earlier ideas meet here. The signature check is a secret that stays on the server. The primary key on the event ID is a constraint that makes the database do the de-duplication. The transaction makes "record the event" and "mark it paid" succeed or fail together.

## Five setups, and why

![Five real scenarios, with the reason for every choice](diagram:five-scenarios-cell-reasons)

**1. A portfolio with a contact form.** There is no login and nothing to store. One function sends the email, because only the email API key must stay secret. Static files plus one function run on Vercel or Cloudflare, with no server to look after.

**2. A leave system for 20 people.** Supabase provides login and the PostgreSQL database, so RLS can use the user's ID to show only their own rows, or their department's. One Edge Function posts to Slack, because the Slack key must stay on the server. Nobody needs live updates, and it can launch in two weeks.

**3. A subscription SaaS.** A three-person team should not rebuild login, so it uses Clerk. Billing data is relational, so Neon's PostgreSQL fits, and it scales to zero while there are few users. Webhooks are short, so route handlers on Vercel are enough. Reports exceed a function's time limit, which is why the worker exists.

**4. Delivery and ride-hailing.** Three kinds of client share one set of accounts, so login is a library the team controls. Orders are relational, and PostGIS answers map queries. Many clients share complex dispatch and pricing rules, so a full server in NestJS or Go is the right place for them. A queue and a worker send notifications without slowing requests, rider positions change every second, so Redis and WebSocket carry them, and steady traffic suits always-on containers.

**5. A mobile chat MVP for two people.** Firebase Auth and Firestore share one SDK, and the SDK has offline sync built in. Security rules are enough at the start, and Cloud Functions can come later for moderation and search. One vendor, one console and no servers fits a team of two.

## Signals that it is time to change

A choice is right for now. These signals say it has stopped being right.

| Signal | Adjustment | Example |
| --- | --- | --- |
| Rules become multi-step and complex | Move them into a database function or your own server. | A leave policy with approval chains no longer fits one RLS rule. |
| Work exceeds the time limit | Move it to a container worker. | Report generation that takes eight minutes. |
| You need long-lived connections | Add a WebSocket server or a hosted realtime service. | A live dashboard that updates every second. |
| Traffic is high and steady | Move to an always-on service. | Pay-per-call functions now cost more than a small container. |
| Vendor lock-in worries you | Move the data to PostgreSQL and keep the login. | Export Firestore data to PostgreSQL, and keep Firebase Auth. |

As of October 2026, services such as Inngest and Trigger.dev are common ways to run long jobs without operating a queue yourself. Check them against your own limits and prices before you commit.

None of these changes means the first choice was wrong. A cheap start that you can replace cell by cell is usually better than a perfect design for traffic you do not have yet.

> [!PRINCIPLE] Core principle
> Choose for the problem in front of you, and watch the signals. Because each capability can be swapped on its own, changing one does not mean rebuilding everything.
