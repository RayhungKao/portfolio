---
title: "Browser workers in practice: Comlink, transfers, Serwist and scope"
date: 2026-10-18
summary: "How to talk to a Web Worker without writing message plumbing, what a transfer saves, and the tools and rules for Service Workers."
series: web-development
order: 708
part: Deep dives
draft: false
---

**What you'll learn:** how to call a Web Worker like a function, when to transfer data instead of copying it, which tools set up a Service Worker, and the rules that trip people up.

[Web Worker vs Service Worker](/blog/web-worker-vs-service-worker) explains why there are two. This article is about using them. Tools and versions change, so the parts that depend on a product reflect October 2026.

## Starting a Web Worker

In a Vite project, a worker is a separate file loaded with a special URL:

```ts
const worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' })
```

Vite also accepts `import ParseWorker from './parse.worker?worker'` and then `new ParseWorker()`. Both make the bundler build the worker file as its own entry, which a plain `new Worker('./parse.worker.ts')` would not.

## Calling a worker like a function: Comlink

Raw workers speak through `postMessage`, so every call needs a message format, a way to match replies to questions, and error handling. Comlink hides that.

```ts
// parse.worker.ts
import * as Comlink from 'comlink'

const api = {
  async parse(text: string) {
    return heavyParse(text)       // runs on the worker's own thread
  },
}
Comlink.expose(api)
```

```ts
// main thread
import * as Comlink from 'comlink'

const api = Comlink.wrap<typeof import('./parse.worker').api>(
  new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' }),
)
const result = await api.parse(bigText)   // looks like a normal async call
```

## What crosses the boundary: clone or transfer

A message between the page and a worker is **structured cloned**: copied, not shared. That has limits and a cost.

- Functions, DOM nodes and class methods cannot be cloned. A class instance arrives as a plain object without its methods.
- Copying a large value takes time and memory on both sides.

For big binary data, **transfer** it instead. The memory moves to the worker without copying, and the sender loses it.

![Structured clone copies; a transfer moves](diagram:clone-vs-transfer)

```ts
const buffer = new ArrayBuffer(8 * 1024 * 1024)
worker.postMessage({ buffer }, [buffer])   // the second argument lists what to transfer
console.log(buffer.byteLength)             // 0: it now belongs to the worker
```

Comlink does the same with `Comlink.transfer(value, [buffer])`. Typical transferables are `ArrayBuffer`, `ImageBitmap`, `OffscreenCanvas` and `MessagePort`.

## The two workers side by side

| | Web Worker | Service Worker |
| --- | --- | --- |
| Created by | `new Worker(url)` from the page | `navigator.serviceWorker.register(url)` |
| File location | Anywhere the bundler can reach | A URL whose path sets its scope, usually `/sw.js` |
| Relationship to React | None; your components just call it | None; it sits outside the component tree |
| How it talks | `postMessage`, or Comlink on top | Events (`fetch`, `push`, `install`) and `postMessage` |
| Lifetime | Lives with the page that created it | Wakes for events, may stop when idle |
| Common tools | Comlink | Serwist, Workbox, `vite-plugin-pwa` |

## Tools for a Service Worker

Writing caching logic by hand is where most bugs come from, so most projects use a library.

| Tool | For | Notes |
| --- | --- | --- |
| Next.js PWA guide | The manifest and web push | Next.js builds the manifest from `app/manifest.ts`; the guide's push example registers its own small service worker |
| Serwist, `@serwist/next` | Offline caching with the webpack build | The worker source (for example `app/sw.ts`) is compiled to `public/sw.js` |
| Serwist, `@serwist/turbopack` | The same, with Turbopack | A separate setup: the worker is built and served through a route in the app (`app/serwist/[path]/route.ts`), so check whether it fits a static export before choosing it |
| `vite-plugin-pwa` with Workbox | Vite projects | Generates the worker and the precache list at build time |

The Next.js documentation points to Serwist for offline support. The documentation does not say whether the Turbopack route-handler setup works with `output: 'export'` (a fully static site has no server to run that route), so test it before you depend on it. Tools move quickly, so read the current documentation before you start.

## Rules that trip people up

- **Scope.** A Service Worker controls the pages at or below the folder it is served from. `/sw.js` can control the whole site; `/app/sw.js` controls only `/app/*`. A worker cannot widen its own scope beyond its location, which is why it usually lives at the root.
- **Test the production build.** Service Worker setups are often switched off in development, so caching is not active there. Verify with `next build && next start` (or `vite build && vite preview`) and check Application → Service Workers in the browser's developer tools.
- **Update behaviour.** A new worker installs but waits until old pages close, unless you call `skipWaiting`. Decide what you want, and what to tell the user.
- **HTTPS only.** Service Workers register only on HTTPS or `localhost`, so testing from a LAN IP address fails.

## Background Sync

Background Sync lets a Service Worker retry a failed request later, when the connection returns, even if the page is closed. As of October 2026, MDN lists it as limited availability: it works in Chromium-based browsers, and Firefox and Safari do not support it. So never make it the only way a change gets sent. Keep a fallback that retries when the app is open. How a retry queue is built is covered in the offline-sync series.

> [!PRINCIPLE] Core principle
> Use a library for the plumbing in both kinds of worker, transfer big data instead of copying it, and test a Service Worker only in a production build.
