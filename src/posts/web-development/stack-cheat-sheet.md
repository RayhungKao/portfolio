---
title: "Stack cheat sheet: three typical stacks and their trade-offs"
date: 2026-10-18
summary: "A quick reference that condenses the series into three typical stacks, a starting rule and a settings table."
series: web-frontend
order: 403
part: Ship it
draft: false
---

**What you'll learn:** three typical stacks layer by layer, how to pick a starting point, and a settings table you can return to.

This is the series condensed into three typical stacks and the trade-offs between them. It covers the frontend parts from the earlier articles and the backend parts from the [backend series](/series/web-backend).

![Three typical stacks, layer by layer, with the backend layers](diagram:three-stacks-with-backend-layers)

The three stacks match three architectures: A is a SPA, B is SSG, C is SSR. A and B can add the dashed backend layers when a need appears. C has them built in. Which backend shape to add is in [Choosing the stack](/blog/choosing-the-stack).

## Trade-offs

| Stack | Suits | Good | Cost |
| --- | --- | --- | --- |
| A · SPA | Logged-in apps, dashboards, creator tools | The simplest deployment, smooth interaction, a light toolchain | Weaker SEO, the first load waits for JS, you choose the router |
| B · Static content | Portfolios, blogs, docs | Fast, cheap, good for SEO, no server | Content is fixed at build time, updating means building again |
| C · Full-stack SSR | Shops, social apps, many dynamic pages | Live content, personalization, good SEO, routing and API built in | Needs a server runtime, higher cost and operations, a heavier framework |

## How to start

- Unsure whether you need SEO: start with A, and pre-render some routes later (moving towards B).
- Content mostly fixed: pick B.
- Each visitor sees different content and the page must be found by search: pick C.

## Settings cheat sheet

| Item | Recommendation |
| --- | --- |
| Node | Pin the version; Vite 8 needs 20.19+ or 22.12+ |
| Package manager | pnpm or npm; one per project; pin it with the `packageManager` field |
| CI | Strict install, type check, build, deploy |
| Type check | `tsc --noEmit`; use `tsc -b` when there are project references |
| Environment variables | Only those with the client prefix (`VITE_`, `NEXT_PUBLIC_`) reach the client; no secrets there |
| SPA deployment | Set a history fallback; set `base` for a sub-path |
| Secrets on the server | Keep keys in server-side environment variables; the browser never sees them. See [When you need a backend](/blog/when-you-need-a-backend) |
| Login | Session cookie or JWT; the trade-off is in [Authentication: session vs JWT](/blog/authentication-session-vs-jwt) |
| Database | PostgreSQL is the usual default; see [Data and storage](/blog/data-and-storage) |
| Backend shape | One of three: functions beside a frontend, a full-stack framework, or a separate API service; see [Full-stack framework or a separate backend](/blog/full-stack-or-separate-backend) |

## Going further

For the rest of the series, see the [series page](/series/web-frontend). To see how Next.js is actually used once you have chosen it, continue with [Next.js in practice](/blog/app-router-and-layouts). For the server side, continue with the [backend series](/series/web-backend).

> [!PRINCIPLE] Core principle
> Use the simplest stack that meets today's need, and move up when a new need appears.
