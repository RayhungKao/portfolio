---
title: "Choosing the stack in practice: platforms, RLS and framework choices"
date: 2026-10-18
summary: "A comparison of six backend platforms, how row-level security is written and where it goes wrong, and a Pages Router and Hono example."
series: web-development
order: 706
part: Deep dives
draft: false
---

**What you'll learn:** what six platforms offer, how row-level security policies are written and what can go wrong, and how code looks in a Pages Router API and in Hono.

[Choosing the stack](/blog/choosing-the-stack) says to choose per capability. This article puts names on the options. Platform features change quickly, so treat the table as the position as of October 2026 and check each product's own documentation before you commit.

## Six platforms

| Platform | What it is | What it gives you | Worth knowing |
| --- | --- | --- | --- |
| Firebase | Google's backend platform | Auth, a document database, file storage, functions | Its client SDKs include offline caching for the data |
| Supabase | A platform built around PostgreSQL | Auth, Postgres with row-level security, storage, functions, realtime | Rules live in the database, so the browser can talk to it directly |
| Appwrite | An open-source backend platform | Auth, databases, storage, functions, realtime, messaging | You can self-host the same stack, and then you operate it |
| Convex | A reactive database with TypeScript functions | Queries and mutations written in TypeScript, live updates to subscribed clients | Mutations are transactions; you write no SQL |
| AWS Amplify (Gen 2) | A toolkit for full-stack apps on AWS | A backend defined in TypeScript, auth, data, hosting | The backend is code in your repo and runs on AWS |
| Neon | Serverless PostgreSQL | A Postgres database with branching, autoscaling and scale to zero | Its core is the database; it also lists auth, realtime, storage and functions as further services, so check how much of the bundle you want |

The grid in [Choosing the stack](/blog/choosing-the-stack) shows why Supabase and Neon appear in the same PostgreSQL row: both run Postgres, and what differs is what comes bundled with it.

## Row-level security, in detail

With a BaaS such as Supabase, the browser talks to the database, so the rules must live in the database. Row-level security (RLS) adds a hidden `WHERE` clause to every query on a table.

```sql
alter table notes enable row level security;   -- without this, the table is not protected

create policy "users read their own notes" on notes
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "users change their own notes" on notes
  for update to authenticated
  using      ( (select auth.uid()) = user_id )   -- which existing rows may be targeted
  with check ( (select auth.uid()) = user_id );  -- what the row may look like afterwards
```

| Piece | Meaning | Example of what it stops |
| --- | --- | --- |
| `using` | Which existing rows an operation can see or target (select, update, delete) | Reading someone else's note |
| `with check` | Whether the resulting row is allowed (insert, update) | Inserting a note owned by someone else, or reassigning a note to another user |
| `to authenticated` | The policy applies only to signed-in requests | Anonymous visitors falling into the policy at all |

Things that go wrong:

- **RLS not enabled.** A table in an exposed schema without RLS is open to any role that has a grant on it. Enable it on every such table.
- **Adding a policy does not remove grants.** If `anon` and `authenticated` already have table privileges, tighten those too.
- **`auth.uid()` is null for anonymous requests.** A comparison with null is never true, but writing the check explicitly (`auth.uid() is not null and …`) makes the intent obvious.
- **Silence means no rows.** With RLS on and no policy, queries return nothing rather than an error. If a screen is empty, check policies first.

## A function in the Pages Router

The App Router uses `app/api/.../route.ts`. Older Next.js projects use the Pages Router, where a file under `pages/api/` exports a handler that receives a request and a response object.

```ts
// pages/api/orders.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()           // one file, many methods
  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'login required' })
  res.status(201).json(await createOrder(user.id, req.body))
}
```

Compare it with the App Router version in [Inside a backend](/blog/inside-a-backend): the logic is the same, the shape is different. App Router exports one function per HTTP method; the Pages Router has one function that checks `req.method` itself.

## Writing once with Hono

If you want the same API to run on Node, Cloudflare Workers, Bun or Deno, a small framework such as Hono is built on the standard `Request` and `Response`, so the application code does not change. Only the last lines do.

```ts
import { Hono } from 'hono'

const app = new Hono()
app.post('/api/orders', async (c) => {
  const user = await getSessionUser(c.req.raw)
  if (!user) return c.json({ error: 'login required' }, 401)
  return c.json(await createOrder(user.id, await c.req.json()), 201)
})

export default app            // Cloudflare Workers, Bun and Deno use this
```

```ts
// Node: add a tiny server file with the adapter
import { serve } from '@hono/node-server'
serve(app)
```

This is what keeps a function from being tied to one platform: the rules and the handler stay put, and only the entry file changes.

> [!PRINCIPLE] Core principle
> A platform is a bundle of capabilities. When the rules sit in the database or in plain `Request`/`Response` code, you can change the bundle without rewriting them.
