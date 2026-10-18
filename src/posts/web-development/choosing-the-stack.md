---
title: Choosing the stack
date: 2026-10-18
summary: Choose per capability, not per brand. Backend-as-a-service, serverless and a full server are the three common bundles.
series: web-development
order: 609
part: Backend
draft: true
---

**What you'll learn:** how to choose a stack capability by capability, what the three common bundles are, and three questions that point to one of them.

"Should I use Supabase, Vercel or my own server?" treats three things as the only options. They are common bundles of choices, and each choice inside a bundle can usually be swapped on its own.

## Choose per capability

List what the app needs, then choose for each row.

![Three packages and a mixed setup, capability by capability](diagram:capability-by-package-matrix)

Read the PostgreSQL row first. It is PostgreSQL in every column, and the only difference is who runs it: Supabase, Neon or you. The mixed column on the right shows the point of the exercise. It uses Firebase for login only and keeps everything else in an own API, because each cell can be replaced separately.

![Firebase for login only, own API for data](diagram:firebase-login-with-own-api)

## Three bundles

| Bundle | What you get | Fits | Costs |
| --- | --- | --- | --- |
| Backend-as-a-service (BaaS) | Login, database, files and access rules from one provider. | A notes app on Supabase, where each user sees their own notes. | Complex logic is awkward, and you depend on the vendor. |
| Serverless functions | Small pieces of code that run on demand. You deploy no server. | A Stripe webhook that runs a few times a day. | Time limits, no long connections, cold starts. |
| Full server | A process that stays running, on a VPS or a container platform. | A delivery API with many clients, or a WebSocket chat. | You operate and scale it. |

In a BaaS, the rules live in the database. With Supabase, **row-level security** (RLS) expresses a rule as SQL, and the database enforces it even though the browser talks to it directly:

```sql
create policy "users manage their own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## What serverless means in practice

Serverless functions have five traits worth knowing:

- **Scale to zero.** With no traffic, nothing runs and nothing is billed.
- **Stateless.** Two calls may run on different machines, so nothing is remembered in memory between them.
- **Cold start.** The first call after idle time is slower.
- **Time limit.** A call has a maximum duration, so long jobs do not fit.
- **Connection pooling.** Many short-lived functions can exhaust a database's connections, so they connect through a pooler.

Functions also cannot keep a connection open for a chat, which is why serverless pairs with hosted realtime: Supabase Realtime, Ably or Pusher, or Cloudflare Durable Objects. Between a page that polls and a full WebSocket server there is a range of options, and the deep dive on realtime walks through it.

## Where function files go

Each platform has its own convention for where the code lives.

| Platform | Where the function lives |
| --- | --- |
| Next.js App Router | `app/api/.../route.ts` (the Pages Router used `pages/api/`) |
| Vercel, without Next.js | `api/` |
| Netlify | `netlify/functions/` |
| AWS Lambda | Defined with SAM, SST or CDK, and exposed through API Gateway or a Function URL |
| Cloudflare Workers | A file exporting `fetch`, deployed with Wrangler |
| Supabase | `supabase/functions/<name>/index.ts` |
| Firebase | `functions/` |

## Three questions

1. **Does the app only need data access plus permissions?** Choose a BaaS. RLS covers the rules, and you write no backend.
2. **Is there custom logic, but small, short and triggered by events?** Choose serverless functions. A webhook, a form handler or an image resize fits.
3. **Do you need long-lived connections, long tasks, heavy computing, or many clients that share one set of rules?** Choose a full server.

Many people say Supabase is a sensible default for a first full-stack project. That is a common view as of October 2026, not a measured fact, and it holds when your needs are question 1. If they are not, the matrix lets you mix.

> [!NOTE] Where the rest lives
> A comparison of platforms, RLS details and framework choices are in the deep dive "Choosing the stack in practice". What a VPS, a container and a PaaS are is in [Where server code runs](/blog/running-server-code).

> [!PRINCIPLE] Core principle
> The unit of choice is each capability. BaaS, serverless and a full server are only common bundles of those choices.
