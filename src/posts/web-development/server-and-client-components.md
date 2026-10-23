---
title: "Server components and client components: who runs where"
date: 2026-10-18
summary: "Files are server components by default; add 'use client' only for the small part that needs interaction or the browser. Plus the other server entry points in Next.js."
series: web-frontend
order: 502
part: Next.js in practice
draft: false
---

**What you'll learn:** how server and client components differ, why a client component runs twice, and which other server entry points Next.js has besides components.

In the App Router, a file without `'use client'` is a server component by default. You switch to a client component only when you need interaction or a browser feature. One question decides it: does this file need interaction or the browser?

## The two kinds

| | Server component (default) | Client component (`'use client'`) |
| --- | --- | --- |
| Where it runs | Node.js: at build time, or the dev server while developing | The browser (also pre-rendered once at build time) |
| Can use | `fs`, `export const metadata`, `generateStaticParams` | `useState`, `useEffect`, `onClick`, `window`, `localStorage` |
| Cannot use | Hooks, event handlers, `window` | `fs`, `metadata`, `generateStaticParams` |
| JavaScript sent to the browser | None, only the computed HTML | Yes, the user downloads it |

## The rule: a server component wraps client components

`'use client'` takes effect downward: when a file is marked client, the files it imports are client too. The other way round is fine: a server component can import and render a client component. The usual shape is an outer server component that reads data and sets metadata, and passes the data as props to an inner client component.

One thing to watch: a module that only works on the server (for example one that uses `fs`) breaks the build if a client component imports it. Move the types and pure functions into a separate file, and let the client import only that one.

## A client component is pre-rendered once

A client component is also pre-rendered to HTML at build time, so visitors see content as soon as the page opens. Then the browser loads the JavaScript and takes over, which is hydration (see [CSR, SSG and SSR](/blog/csr-ssg-ssr)). So a client component runs once on Node and once in the browser, which brings two limits.

- **Do not read `window` during initialization.** The pre-render runs on Node, where there is no `window`. State that depends on the screen width must be set after mount in a `useEffect`. Otherwise the pre-rendered HTML differs from the browser's first render and React reports a hydration error.
- **Some code cannot even be pre-rendered.** A canvas library touches `window` and `canvas` as soon as it loads. Use `next/dynamic` with `{ ssr: false }` so it does not run at build time at all, only in the browser. `ssr: false` is allowed only inside a client component, so you add a very thin `'use client'` file between the server layout and the canvas.

## Why not all client, and not all server

You cannot make everything a client component:

1. Some features exist only in server components. `metadata` sets each URL's title and share preview, and `generateStaticParams` decides which pages to generate.
2. Some code cannot run in the browser, such as `fs`, which reads files.
3. Server component code never reaches the browser, so each extra `'use client'` is more JavaScript for the user to download.

You cannot make everything a server component either: anything that needs `useState`, `useEffect`, event handling or `window` (a theme toggle, a canvas, highlighting the current page in a nav bar) cannot run without a browser.

In practice a server component wraps client components: the outer layer reads data and sets metadata, the inner layer handles interaction.

## Server entry points beyond server components

Server components render pages. A server can also be asked to do things, and Next.js has three entry points for that.

| Entry point | File | What it is | Example |
| --- | --- | --- | --- |
| Route Handler | `app/api/orders/route.ts` | A plain HTTP endpoint for any caller | A payment provider's webhook, a mobile app's API |
| Server Action | A function marked `'use server'` | A function you call from a form or a component | A "Place order" button |
| `proxy.ts` | One file at the project root (it replaced `middleware.ts` in Next.js 16) | Runs before routes are matched | Redirect visitors without a session away from `/dashboard` |

**A Server Action is a public POST endpoint.** It looks like a normal function call in your component, but under the hood Next.js gives it a URL, and anyone who finds that URL can send a request to it with data you did not expect. So an action must do the same checks as any endpoint. Here is one, with each layer marked the same way as in [Inside a backend](/blog/inside-a-backend):

```ts
// app/orders/actions.ts
'use server'

export async function placeOrder(formData: FormData) {
  // 1. Who is calling? Anyone can reach this endpoint, so check every time.
  const user = await getSessionUser() // reads the session cookie
  if (!user) throw new Error('login required')

  // 2. Is the input the right shape? Never trust form data.
  const parsed = orderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'bad input' }

  // 3. Hand off to the service layer, which knows the business rules.
  return createOrder(user.id, parsed.data)
}
```

`proxy.ts` is a coarse gate, not a replacement for those checks. It is a good place to redirect early, but handlers and actions can be reached by other means, so each one still verifies the user itself.

None of the three work at request time in a static export. [Static export](/blog/static-export-and-build-time) lists exactly what is left.

> [!PRINCIPLE] Core principle
> Default to server components, and mark only the small part that needs interaction or the browser as `'use client'`. Treat every Server Action like a public endpoint.

Next: [Static export](/blog/static-export-and-build-time).
