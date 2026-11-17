---
title: "Full-stack framework or a separate backend"
date: 2026-10-18
summary: Two independent questions, where the HTML comes from and whether the backend is separate, and what Next.js gives you on the server.
series: web-backend
order: 203
part: Choosing a backend architecture
draft: false
---

**What you'll learn:** how to describe an application with two independent questions, the three shapes that result, what really separates B from C, what a BFF is and when it pays off, and when a Next.js project can be your whole backend.

"Should I use Next.js for everything, or build a separate backend?" sounds like one question and is two. Mixing them is why the debate never ends.

## Two axes

The first axis is **rendering**: where does the HTML come from? In a single-page app (SPA) the browser builds it from JavaScript. In a multi-page app (MPA) the server sends a finished page for each URL. A hybrid, which is where Next.js lives, does both depending on the page.

The second axis is **deployment**: is the backend in the same project as the frontend, or a separate service?

| Rendering | Backend together | Backend separate |
| --- | --- | --- |
| SPA | A Vite app served by an Express server that also hosts the API | A React app on a CDN calling a Java or Go API |
| MPA | A Rails or Django site | A server-rendered site that calls an internal API |
| Hybrid | Next.js with Route Handlers talking to the database | Next.js calling a shared API service |

Each row can be combined with either column. Picking Next.js tells you nothing about whether the backend is separate.

Whether the code lives in one repository (a monorepo) or several is a third question, just as independent. It changes how you share types and run CI, not what runs in production. A monorepo can deploy its API to `api.shop.com` and its site to `www.shop.com`; several repositories can sit behind one domain, with a reverse proxy sending `/api` to the backend. The domain layout, and with it whether the browser needs CORS, is decided at deployment.

## Three shapes

![Three common application shapes](diagram:three-application-shapes)

**A. Next.js does everything.** One project holds the pages and the API, and talks to the database directly. A small team can ship it alone.

**B. Next.js plus a separate backend.** Next.js still renders the pages, but business logic lives in another service. In this shape Next.js often acts as a **BFF** (backend for frontend): a thin server that exists only for this one frontend. It gathers data from several services, shapes it for the screen and hides internal addresses and keys from the browser.

**C. Front and back separated.** A static frontend sits on a CDN and the browser calls an API server directly. The API can be written in any language.

## What Next.js gives you on the server

Four pieces make shape A possible.

- **Server Components** render on the server and can read the database directly, so no API call is needed for the page's own data.
- **Route Handlers** (`app/api/.../route.ts`) are plain HTTP endpoints, such as `POST /api/orders`.
- **Server Actions** are functions you call from a form or a component. Under the hood, each one is an internal POST endpoint, which means it can be called by anyone who finds it, so each action must check the user for itself.
- **`proxy.ts`** runs before routes are matched, for coarse gates such as redirecting visitors without a session.

In a static export, none of these work at request time. This portfolio is built with `output: 'export'`, so the result is a folder of files and there is no server at runtime. Server Components run once, during the build. A Route Handler can only produce a fixed `GET` response at build time. Server Actions and `proxy.ts` are not supported at all. If you need any of the four to react to a live request, you need a host that runs Node. The full list is in [Static export: server code runs only at build time](/blog/static-export-and-build-time).

## When one project is enough

Choose shape A when:

- A small team ships both sides together. Changing a field then means editing one repository, and the type checker catches both ends.
- There is one web client. No mobile app needs the same API.
- You are building an MVP and want the fewest moving parts.

## When to split

Choose B or C when:

- **More than one client** needs the same rules. A web app, an iOS app and a partner integration should not each reimplement pricing.
- **A backend team already works in another language**, such as Go or Java, and you want to keep it that way.
- **The backend needs long-lived connections or heavy computing**, such as WebSocket chat or video processing, which suit a long-running server more than a function.
- **Parts must scale or release independently.** The checkout service should deploy without redeploying the marketing site.

A useful middle path is to start with A and let the code tell you when to split. If your Route Handlers keep calling one service module, that module is already the future backend.

## B or C: is there a server of yours in between?

B and C both have a separate backend. The difference is one hop. In B, the browser talks only to a server you run (Next.js), which calls the backend and answers. In C, the browser calls the backend itself.

| | B: Next.js as a BFF | C: static frontend, browser calls the API |
| --- | --- | --- |
| Who calls the backend | The Next.js server | The browser |
| Where a secret key can live | On the Next.js server | Nowhere in the frontend: anything the browser runs can be read |
| A screen that needs three services | One request from the browser; the three calls happen inside the data center | Three requests over the user's network, or one endpoint the backend adds for that screen |
| What has to keep running | Your server code (a Node server, or functions on a host such as Vercel) as well as the backend | Only the backend; the frontend is files on a CDN |
| Origins the browser talks to | One, so no CORS | Usually two (site and API), so the API must allow the site with CORS |

Search engines do not decide between them. C can still prerender every page with SSG, so the HTML arrives complete; what C lacks is code of yours that runs on each request, in front of the API.

### A BFF is a role, not a rendering mode

CSR, SSG and SSR say when the HTML is made ([When the HTML is produced: CSR, SSG and SSR](/blog/csr-ssg-ssr)). A BFF says whether data passes through a server of yours on its way to the browser. In Next.js, the BFF is whichever server code calls the backend while a request is in flight:

- **A Server Component rendered per request** fetches from the backend while it builds the page.
- **A Route Handler or Server Action** handles what the browser sends after the page has loaded. The browser calls `/api/checkout` on its own site, and the handler calls the order and payment services with a key the browser never sees. Both are public endpoints that anyone can call, so each one checks the user before it uses that key.
- **An SSG page** calls the backend only during the build. A fully static site, such as this portfolio, has no BFF at runtime.

If a request only needs forwarding, `rewrites` in `next.config.js` does it without code; a Route Handler is for checking, combining or reshaping what comes back. The Next.js documentation describes all of this as using Next.js as a backend for your frontend, and adds that it is not a full backend replacement. The service behind the BFF is the API server or the app server. Both names usually mean the same process: "API server" names it by what it exposes, "app server" by what it runs, the business logic.

### When a BFF pays off

Sam Newman, whose article describes the pattern, saw it in use at REA and SoundCloud. He has the team that builds the interface own its BFF, and he doubts a BFF is worth it for a web-only interface unless the server does a significant amount of aggregation. Microsoft's description of the pattern agrees: it may not fit when only one interface uses the backend, or when the interfaces make the same requests. What it costs is concrete: one more service to deploy and watch, and one more network hop on every request.

> [!NOTE] Where the rest lives
> How Server Actions and Route Handlers differ in detail is covered in [Server and client components](/blog/server-and-client-components), in the [frontend series](/series/web-frontend).

> [!PRINCIPLE] Core principle
> Rendering answers where the HTML comes from. Deployment answers whether the backend is separate. They are two independent axes.
