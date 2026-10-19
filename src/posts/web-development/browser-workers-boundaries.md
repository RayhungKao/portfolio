---
title: "Browser workers: what crosses the boundary, scope and updates"
date: 2026-10-18
summary: "What a copy and a transfer cost when data crosses to a Web Worker, and the scope, update and HTTPS rules that trip people up with Service Workers."
series: web-development
order: 704
part: Going further
draft: false
---

**What you'll learn:** what happens to data that crosses to a Web Worker, when to transfer instead of copy, and the rules that trip people up with Service Workers.

[Web Worker vs Service Worker](/blog/web-worker-vs-service-worker) explains why there are two. This article covers the parts that surprise people when they use them.

## What crosses the boundary: clone or transfer

A message between the page and a Web Worker is **structured cloned**: copied, not shared. That has limits and a cost.

- Functions, DOM nodes and class methods cannot be cloned. A class instance arrives as a plain object without its methods.
- Copying a large value takes time and memory on both sides.

For big binary data, **transfer** it instead. The memory moves to the worker without copying, and the sender loses it.

![Structured clone copies; a transfer moves](diagram:clone-vs-transfer)

```ts
const buffer = new ArrayBuffer(8 * 1024 * 1024)
worker.postMessage({ buffer }, [buffer])   // the second argument lists what to transfer
console.log(buffer.byteLength)             // 0: it now belongs to the worker
```

Typical transferables are `ArrayBuffer`, `ImageBitmap`, `OffscreenCanvas` and `MessagePort`. Example: an 8 MB image buffer sent to a worker for filtering is copied by default; transferring it costs almost nothing.

## Messages are plumbing; a library can hide it

Raw workers talk through `postMessage`, so every call needs a message format, a way to match replies to questions, and error handling. Comlink is a 1.1 kB library that wraps `postMessage` so you call the worker's functions as if they were local, with `await`. The alternative is writing the messages yourself, which is fine for one or two message types and tedious beyond that.

## Service Worker rules that trip people up

- **Scope.** A Service Worker controls the pages at or below the folder it is served from. `/sw.js` can control the whole site; `/app/sw.js` controls only `/app/*`. A worker cannot widen its own scope, which is why it usually lives at the root.
- **Test the production build.** Service Worker setups are often switched off in development, so caching is not active there. Verify with a production build and check Application → Service Workers in the browser's developer tools.
- **Update behaviour.** A new worker installs but waits until old pages close, unless you call `skipWaiting`. Decide what you want, and what to tell the user.
- **HTTPS only.** Service Workers register only on HTTPS or `localhost`, so testing from a LAN IP address fails.

## Do not write the caching by hand

Caching logic is where most bugs come from, so most projects use a library. Workbox is Google's. Serwist is a maintained fork of Workbox, created after Workbox's development stalled, with packages for Next.js, Vite, webpack, Nuxt and SvelteKit. `vite-plugin-pwa` is a Vite plugin that uses Workbox, either generating the worker (`generateSW`, the default) or injecting a precache list into one you write (`injectManifest`). For Next.js, check Serwist's current documentation for your bundler, because the setup differs between webpack and Turbopack and the documentation may not say whether it works with `output: 'export'`. Test before you depend on it.

## Background Sync

Background Sync lets a Service Worker retry a failed request later, when the connection returns, even if the page is closed. As of October 2026, MDN lists it as limited availability: it works in Chromium-based browsers, and Firefox and Safari do not support it. So never make it the only way a change gets sent. Keep a fallback that retries when the app is open. How a retry queue is built is covered in the offline-sync series.

> [!PRINCIPLE] Core principle
> Data crossing to a worker is copied unless you transfer it, a Service Worker's reach is set by where it is served from, and its caching should only be trusted after testing a production build.
