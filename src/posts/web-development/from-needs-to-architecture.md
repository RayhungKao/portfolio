---
title: "From needs to architecture: one decision flow"
date: 2026-10-18
summary: "Two questions pick a rendering mode, a third adds a backend, and the simplest architecture that works is the right place to start."
series: web-development
order: 203
part: Needs to architecture
draft: false
---

**What you'll learn:** how to turn needs into an architecture with three questions, which common choices match each result, and why you start with the simplest one.

The last two articles can be joined into one flow: two questions pick a rendering mode, and a third decides whether to add a backend.

![Decision flow: two questions pick the rendering mode, a third adds a backend](diagram:decision-flow-with-backend-branch)

## Three questions

1. **Do you need search engines to find the page, or a preview when it is shared?** If not, build a **SPA** (single-page app, rendered in the browser). Example: a dashboard behind a login.
2. **If yes: is the content known at build time?** If so, use **SSG**. If not, use **SSR**. Example: documentation is SSG; a product page with live stock is SSR.
3. **Do you need server-side logic such as an API, a login or a database?** This question is not on the main path because it can sit beside any of the three rendering modes. See [When you need a backend](/blog/when-you-need-a-backend) for how to answer it.

The interaction question from the previous article does not change the rendering mode. It changes how much work stays in the browser once the mode is chosen.

## Needs, architecture, common choices

| Need | Architecture | Common choices |
| --- | --- | --- |
| A logged-in app, a dashboard, a canvas tool | SPA | Vite with React or Vue |
| A portfolio, blog or docs, content known at build time | SSG | Astro, Next.js static export |
| Many dynamic pages, personalized content, SEO needed | SSR | Next.js, Nuxt |
| An API, a login or a database (question 3) | Add a backend | A full-stack framework such as Next.js, a BaaS, or serverless functions |

Next.js appears in more than one row because one framework can serve several architectures. You choose, per project or even per page, whether it exports static files, renders on a server or hosts API routes.

Two other needs sit outside this flow: publishing a library (Vite library mode) and sharing code between apps (a monorepo, for example with pnpm workspaces).

## Start with the simplest architecture, then add

There is one rule: use the architecture with the fewest moving parts that meets today's need, and add a layer when a need appears. A SPA is the usual starting point: its output is only static files, so it needs nothing but static hosting, and you run no server code of your own. That does not mean a SPA can never have a backend. When the app needs a login or a database, the SPA calls a backend API, and you add that layer at stage 3 below. "Simplest" describes the architecture, not the tool: Vite is one common way to build a SPA, and webpack or Parcel can do the same.

| Stage | Need that appears | What to add |
| --- | --- | --- |
| 1 | Only interaction, no SEO need | A SPA (static files) |
| 2 | Some pages must be found by search | Pre-render those pages (SSG) |
| 3 | Data that is only known per request, or an API, login or database | A backend: a BaaS (backend as a service, such as Firebase or Supabase), serverless functions, or move to an SSR framework |

**Serverless functions** are small pieces of backend code, such as one API endpoint, that a cloud platform runs only when a request arrives, so you keep no server running (for example AWS Lambda or Vercel Functions). [Choosing the stack](/blog/choosing-the-stack) covers their limits and compares them with the other backend shapes.

> [!PRINCIPLE] Core principle
> Two questions pick the rendering mode, and the third decides whether to add a backend. Begin with the simplest architecture and add a layer only when a need requires it.
