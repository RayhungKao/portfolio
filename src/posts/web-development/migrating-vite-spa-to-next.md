---
title: "Migrating a Vite SPA to Next.js: what changed and how to verify"
date: 2026-10-18
summary: "Most components move unchanged. What changes is routing, where data comes from and which code may only run in the browser."
series: web-development
order: 504
part: Next.js in practice
draft: true
---

**What you'll learn:** what changes when a Vite single-page app moves to Next.js, what to decide before you start, and how to check that behaviour did not change.

Moving a Vite single-page app to Next.js does not mean rewriting most components. What really changes is three things: routing, where data comes from, and which code may only run in the browser. This article uses this portfolio's own migration as the example, with a table of changes and how it was verified.

## Why migrate

A single-page app (the CSR of [CSR, SSG and SSR](/blog/csr-ssg-ssr)) answers every URL with the same `index.html`, so no post has its own title or share preview. After moving to Next.js with a static export, each URL gets a real HTML file at build time, and the place it is deployed stays the same (still GitHub Pages).

## What changed

| Vite | Next.js | Why |
| --- | --- | --- |
| `<head>`, fonts and scripts in `index.html` | `app/layout.tsx` | The root layout owns `<html>`, metadata and the site frame |
| `import.meta.glob` to read Markdown | `fs` on the server, at build time | Next.js has no such API, and reading files belongs at build time anyway |
| `import.meta.env.BASE_URL` | `env` in `next.config.ts` inlining `NEXT_PUBLIC_BASE_PATH` | The prefix now comes from the Next.js config |
| `import x from './a.svg?raw'` | A script turns each `.svg` into a TypeScript module | Next.js does not support `?raw` |
| A hand-written History API router plus a `404.html` fallback | `usePathname()`, `useRouter()`; every URL has a real HTML file | The framework owns routing, so no fallback trick is needed |
| One `App` component for every page | One page per URL, shared parts in a layout | See [App Router and layouts](/blog/app-router-and-layouts) |
| `vite.config.ts`, `vite/client` types | Removed; use `next.config.ts` | The toolchain changed |

## Decide three things first

1. **Which screens must stay put across navigation.** This decides how to cut layouts ([App Router and layouts](/blog/app-router-and-layouts)).
2. **Which code may only run on the server and which only in the browser.** A module that reads files must not be imported by a client component, and a library that touches `window` needs `ssr: false` ([Server and client components](/blog/server-and-client-components)).
3. **The prefix and the static export's limits.** A sub-path deployment needs `basePath`, and there is no `proxy.ts` and no automatic redirects ([Static export](/blog/static-export-and-build-time)).

## How to verify

1. **Build in a clean environment.** An installed `node_modules` holds native files for its platform and cannot be shared across platforms. Run `npm install` again on another machine or in CI, then build.
2. **Check the output.** Every expected URL has an HTML file in `out/`, and links and assets carry the prefix (for example `/portfolio/_next/…`).
3. **Run the real flows in a headless browser.** The home page, navigation, opening a deep URL directly, keyboard use, the browser's back and forward buttons, switching views, whether the theme survives a refresh, and that the console shows no errors.
4. **Say honestly what was not verified.** For example, whether a navigation really avoids a full page reload has to be confirmed in a real browser's Network panel. A changing URL alone does not prove it.

## Debt left behind

To keep the change small, the migration kept `<a href>` with a global click interceptor instead of converting everything to Next.js's `<Link>`. It works, but the interceptor treats every internal link as a page navigation, so a link to a file in `public/` (a PDF, say) needs `download` or `target`. In the long run it should become `<Link>`.

> [!PRINCIPLE] Core principle
> Migration is not a rewrite. Separate routing, data source and browser-only code first, move the other components unchanged, then use an automated flow to show behaviour did not change.

For the overall recap of choices, see [Stack cheat sheet](/blog/stack-cheat-sheet), or go back to the [series page](/series/web-development).
