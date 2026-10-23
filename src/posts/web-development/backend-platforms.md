---
title: "Backend platforms: what each one bundles and where the rules live"
date: 2026-10-18
summary: "Six backend platforms compared by what they bundle, and why row-level security decides whether the browser may talk to the database directly."
series: web-backend
order: 205
part: Choosing a backend architecture
draft: false
---

**What you'll learn:** what six backend platforms bundle, why the rules must live in the database when the browser talks to it directly, and what goes wrong when they do not.

[Choosing the stack](/blog/choosing-the-stack) says to choose per capability. This article puts names on the options. Platform features change quickly, so treat the table as the position in October 2026, checked against each product's own documentation, and read the current pages before you commit.

## Six platforms

| Platform | What it is | What it bundles | Pick it when (example) | What you give up |
| --- | --- | --- | --- | --- |
| Supabase | A platform built around PostgreSQL | Postgres with row-level security, Auth, Storage, Edge Functions (TypeScript on Deno), Realtime | You want SQL and the option to leave, since the core is plain Postgres. E.g. a notes app where each user sees only their rows. | Rules live in the database, so you must write and test them (next section). |
| Firebase | Google's backend platform | Authentication, Cloud Firestore (a NoSQL database that syncs data), Cloud Functions | You want a document database with client-side caching. E.g. a mobile app that must keep working offline. | Offline persistence is supported on Android, Apple and web, but on web it is disabled by default and must be turned on. |
| Appwrite | An open-source backend platform | Auth, Databases, Storage, Functions, Messaging, Realtime, Sites | You want one platform you can also host yourself. E.g. a team that must keep data on its own servers. | Self-hosting means you operate it: it runs as a set of Docker services. |
| Convex | A reactive database with TypeScript functions | Queries and mutations written in TypeScript; queries re-run and push results to subscribed clients | The product is a live view of changing data and the team writes TypeScript throughout. E.g. a shared task board. | You query with TypeScript instead of SQL, so SQL tools and knowledge do not carry over. |
| AWS Amplify (Gen 2) | A toolkit for full-stack apps on AWS | A backend defined in TypeScript files in your repo: Cognito for auth, AppSync and DynamoDB for data, plus hosting | You are on AWS already and want the backend as code next to the frontend. E.g. one repo with per-developer sandbox environments. | You run on AWS services and their limits, and the model is closer to DynamoDB than to SQL. |
| Neon | Serverless PostgreSQL | Postgres with autoscaling, scale to zero and branching; its documentation also lists Auth, Realtime, Object Storage, Functions and a Data API | You want only a Postgres database and will bring the rest. E.g. a Next.js app with its own API on a serverless host. | Check how much of the wider bundle you want before treating it as a database only. Neon joined Databricks in May 2025, and part of its documentation now uses the name Lakebase Postgres. |

The grid in [Choosing the stack](/blog/choosing-the-stack) shows why Supabase and Neon appear in the same PostgreSQL row: both run Postgres, and what differs is what comes bundled with it.

## Why the rules must live in the database

With a platform such as Supabase, the browser talks to the database directly. There is no API of yours in between to check "is this your note?", so the database has to check. **Row-level security** (RLS) does it: a policy adds a hidden condition to every query on a table.

| What the browser sends | What the database actually runs |
| --- | --- |
| `select * from notes` | `select * from notes where user_id = <the signed-in user>` |
| `update notes set title = 'x' where id = 7` | the same, but only if note 7 belongs to the signed-in user, and the row still belongs to them afterwards |

A policy has two parts. The `using` part says which existing rows an operation may see or change. The `with check` part says what the row may look like afterwards, so a user cannot insert a note owned by someone else or hand one of theirs to another user.

## What goes wrong

- **RLS not enabled.** A table in an exposed schema without RLS is readable and writable by any role that has a grant on it. Enable it on every such table.
- **Adding a policy does not remove grants.** If the `anon` and `authenticated` roles already hold privileges on a table, revoke the ones they should not have.
- **`auth.uid()` is null for anonymous requests.** A comparison with null is never true, so such a check fails silently. Supabase recommends writing `auth.uid() is not null and …` so the intent is visible, and naming the role the policy applies to (`to authenticated`).
- **Silence means no rows.** With RLS on and no policy, the API returns nothing rather than an error. If a screen is empty, check the policies first.

The same idea applies to any design: keep the rules where every caller must pass through them, so changing the platform does not mean rewriting the rules.

> [!PRINCIPLE] Core principle
> A platform is a bundle of capabilities. When the browser talks to the database directly, the rules must live in the database, and a table without a policy is either empty or open.
