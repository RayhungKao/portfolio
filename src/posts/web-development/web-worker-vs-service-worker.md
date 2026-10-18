---
title: Web Worker vs Service Worker
date: 2026-10-18
summary: "Two browser features with similar names and different jobs: one keeps the page from freezing, the other sits between the page and the network."
series: web-development
order: 399
part: Toolchain
draft: true
---

**What you'll learn:** what a Web Worker and a Service Worker each solve, how to use each in a React or Next.js project, and the three pitfalls that catch most people with Service Workers.

Both are JavaScript that runs apart from your page, and both are called a "worker". That is where the likeness ends.

![Where a Web Worker and a Service Worker sit in the browser](diagram:web-worker-vs-service-worker-position)

| | Web Worker | Service Worker |
| --- | --- | --- |
| Solves | A page that freezes during heavy computation | Offline use, caching, and push notifications |
| Lifecycle | Created by a component, ends when you stop it | Registered once per site, managed by the browser |
| Intercepts requests | No | Yes, every request from the page |
| Serves | The one page that created it | The whole site, every tab |
| Example | Sorting 200,000 rows without freezing the screen | Opening a news article you already read when the subway loses signal |

Two limits are shared. Neither can touch the DOM, so they cannot read or change what is on the screen. A Service Worker also needs HTTPS, with `localhost` allowed for development.

## Web Worker: move heavy work off the main thread

JavaScript on a page runs on one thread that also draws the screen. A long computation blocks it, and the page stops responding. A Web Worker runs the computation on another thread and sends back the result.

```ts
// sort.worker.ts
self.onmessage = (e: MessageEvent<number[]>) => {
  self.postMessage([...e.data].sort((a, b) => a - b))
}

// in a React component
useEffect(() => {
  const worker = new Worker(new URL('./sort.worker.ts', import.meta.url))
  worker.onmessage = (e) => setSorted(e.data)
  worker.postMessage(numbers)
  return () => worker.terminate()
}, [numbers])
```

The `new URL(…, import.meta.url)` form lets the bundler package the worker file separately. In Next.js the `new Worker` call must sit inside `useEffect`: during server rendering there is no browser and no `Worker`, so a call at the top of the module would crash. The cleanup function stops the worker when the component goes away.

## Service Worker: a programmable proxy in the browser

A Service Worker is a script that the browser keeps ready in the background. Every request from your pages goes through it first, and it decides what to do.

![What a Service Worker can do with each request](diagram:service-worker-request-decision)

Four uses follow from that:

| Use | What it does | Example |
| --- | --- | --- |
| Offline | Answers requests from saved copies when the network is gone. | An installed app that still opens on a plane. |
| Cache strategies | Chooses, per request, between the cache and the network. | Fonts from the cache, prices from the network. |
| Push | Wakes up to show a notification, even when the site is closed. | "Your order shipped." |
| Background sync | Retries a request when the connection returns. | A queued message. Supported in Chromium browsers only, as of October 2026. |

The cache strategies are the part you will configure most.

![Three caching strategies a Service Worker can use](diagram:service-worker-cache-strategies)

*Cache first* suits files that rarely change, such as a logo. *Network first* suits data that must be fresh, with the cache as a fallback. *Stale-while-revalidate* answers at once from the cache and refreshes it in the background.

A minimal cache-first worker, with its registration:

```js
// public/sw.js
const CACHE = 'app-v1'
self.addEventListener('install', (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/logo.svg']))))
self.addEventListener('fetch', (e) =>
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request))))

// in the page, once
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')
```

## Three pitfalls

![How a new Service Worker version takes over](diagram:service-worker-update-timeline)

| Pitfall | What happens | What to do |
| --- | --- | --- |
| The update does not apply | A new version installs but waits until every tab running the old one is closed, so users keep seeing old code. | Version your cache names. Use `skipWaiting()` and `clients.claim()` only when you accept swapping mid-session. |
| Caching private data | A cache-first rule on `/api/me` can show one user's data to the next person on a shared device. | Cache only public, static files. Never cache authenticated responses. |
| It only works on HTTPS | On plain HTTP, registration silently fails. | Use HTTPS in production, and `localhost` while developing. |

To debug, open Chrome DevTools, go to the Application panel and choose Service Workers. You can see the active and waiting versions, force an update and clear the cache. Lighthouse runs a PWA check that reports what is missing.

> [!NOTE] Where the rest lives
> Comlink, transferable objects, tools such as Serwist and Workbox, scope rules, and how a Web Worker differs from a backend worker are in the deep dives "Browser workers in practice" and "Queues and workers".

> [!PRINCIPLE] Core principle
> A Web Worker solves a page that freezes. A Service Worker solves a page that depends on the network. They run in different places for different reasons.
