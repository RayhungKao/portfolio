---
title: "From needs to architecture: one decision flow"
date: 2026-10-18
summary: "Two questions pick a route, a third adds a backend, and the simplest architecture that works is the right place to start."
series: web-development
order: 203
part: Needs to architecture
draft: false
---

**What you'll learn:** how to turn needs into an architecture with three questions, which common choices match each result, and why you start with the simplest one.

The last two articles can be joined into one flow: two questions pick a route, and a third decides whether to add a backend.

![Decision flow: two questions pick the route, a third adds a backend](diagram:decision-flow-with-backend-branch)

## Three questions

1. **Do you need search engines to find the page, or a preview when it is shared?** If not, build a **SPA** (single-page app, rendered in the browser). Example: a dashboard behind a login.
2. **If yes: is the content known at build time?** If so, use **SSG**. If not, use **SSR**. Example: documentation is SSG; a product page with live stock is SSR.
3. **Do you need server-side logic such as an API, a login or a database?** This question is not on the main path because it can sit beside any of the three routes. See [When you need a backend](/blog/when-you-need-a-backend) for how to answer it.

The interaction question from the previous article does not change the route. It changes how much work stays in the browser once the route is chosen.

## Needs, architecture, common choices

| Need | Architecture | Common choices |
| --- | --- | --- |
| A logged-in app, a dashboard, a canvas tool | SPA | Vite with React or Vue |
| A portfolio, blog or docs, content known at build time | SSG | Astro, Next.js static export, pre-rendering in a Vite-based framework |
| Many dynamic pages, personalized content, SEO needed | SSR | Next.js, Nuxt, React Router framework mode |
| Frontend and backend in one repo, API routes | Full-stack framework | Next.js and similar |
| Publishing a library | Library mode | Vite library mode (`build.lib`) |
| Several apps sharing code | Monorepo | pnpm workspaces |

A Vite-based framework is one built on top of Vite: React Router in framework mode, TanStack Start (which can also use Rsbuild), Astro, Nuxt and SvelteKit. Most offer SSR or pre-rendering, but check each one's own documentation before you adopt it.

## Start with the simplest architecture, then add

There is one rule: use the architecture with the fewest moving parts that meets today's need, and add a layer when a need appears. "Simplest" describes the architecture, not the tool. A SPA's output is only static files and needs no server, so it is the simplest. Vite is just one common tool for building a SPA, and webpack or Parcel can do the same. It is not the answer to the rule.

| Stage | Need that appears | What to add |
| --- | --- | --- |
| 1 | Only interaction, no SEO need | A SPA (static files) |
| 2 | Some pages must be found by search | Pre-render those routes (SSG) |
| 3 | Data that is only known per request, or an API, login or database | A backend: a BaaS (backend as a service, such as Firebase or Supabase), serverless functions, or move to an SSR framework |

**Serverless functions** are small pieces of backend code, such as one API endpoint, deployed on a cloud platform and started only when a request arrives. You do not keep a server running, and billing is usually per execution. Examples: AWS Lambda, Vercel Functions, Netlify Functions and Cloudflare Workers. They suit a little backend work, such as receiving a form or calling an API that needs a secret. The limits are a time cap on each run and no memory between requests (stateless). [Choosing the stack](/blog/choosing-the-stack) compares them with the other backend shapes.

> [!PRINCIPLE] Core principle
> Two questions pick the route, and the third decides whether to add a backend. Begin with the simplest architecture and add a layer only when a need requires it.
