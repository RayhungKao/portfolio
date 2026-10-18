---
title: "App Router: folders are routes, layouts keep the screen alive"
date: 2026-10-18
summary: "In the Next.js App Router the URL comes from folders, and nested layouts survive navigation, which is how an interactive canvas stays put while the URL changes."
series: web-development
order: 501
part: Next.js in practice
draft: true
---

**What you'll learn:** how folders become routes, why layouts are not unmounted on navigation, and how to keep a screen alive while the URL changes.

In the Next.js App Router the URL is decided by folders, and layouts are nested: when you navigate, a layout that both pages share is not unmounted, so its state and its screen are kept. A page that needs "the URL changes but the screen must not be rebuilt" belongs in a layout.

## Folders are routes

Each folder can hold a `page.tsx` (what this URL shows) and a `layout.tsx` (the frame shared by everything below this folder). A folder in square brackets is a dynamic route: `[id]` matches any id.

```text
app/layout.tsx               ← root layout, wraps the whole site
├─ app/page.tsx              → /
├─ app/blog/page.tsx         → /blog
└─ app/work/layout.tsx       ← wraps only the pages under /work
   ├─ app/work/page.tsx         → /work
   └─ app/work/[id]/page.tsx    → /work/ai-agent
```

Only the root layout is required, because it has to output `<html>` and `<body>`. Other layouts are optional: add one when a group of URLs should share a frame. In a static export, a dynamic route also needs `generateStaticParams` to list the ids, so the build knows which pages to generate.

## Layouts are nested and are not unmounted on navigation

At `/work/ai-agent` the screen is layers: the root layout wraps the work layout, which wraps `[id]/page.tsx`. When the URL moves between pages under the same layout, that layout's React state and DOM are kept. Only `children`, the page, is swapped.

| Navigation | Root layout | Work layout |
| --- | --- | --- |
| `/work` → `/work/ai-agent` | Kept | Kept |
| `/work/ai-agent` → `/work/canvas` | Kept | Kept |
| `/work` → `/blog` | Kept | Unmounted |

## An example: why the interactive canvas lives in a layout

The Work page of this portfolio is a canvas, drawn with Fabric, that holds all the cards. Click a card and the camera flies to it and the card grows into a slide, while the URL changes from `/work` to `/work/ai-agent`. This only works if **the URL changes and the canvas is not rebuilt**. A rebuild would reset the camera, leave the animation with no starting point and lose the card positions the visitor dragged.

If the canvas lived in `app/work/[id]/page.tsx`, then `/work` and `/work/ai-agent` would be two different page components. Navigating would unmount one and mount the other, and the canvas would be rebuilt every time.

So the canvas goes in the parent they share, `app/work/layout.tsx`. The pages shrink to nothing (they return `null`) and only declare that the URL exists and provide `generateStaticParams`. The canvas reads the URL itself with `usePathname()` and decides whether a card is open.

## The alternative and its price

Another way is a single `/work` page that opens a card with a query parameter such as `?card=ai-agent`. It needs no layout trick, but in a static export each card has no HTML file of its own, so link previews and search engines cannot tell which card a link points to. If every URL needs its own title and preview, choose one real URL per card and put the canvas in the layout.

The price is that the page files look empty, which puzzles anyone reading them for the first time. Leave a one-line comment in the layout that says why.

> [!PRINCIPLE] Core principle
> To keep a piece of the screen still across navigation, put it in a shared parent layout, not in each page.

Next: [Server and client components](/blog/server-and-client-components). To review: [CSR, SSG and SSR](/blog/csr-ssg-ssr) for rendering and hydration, and [Routing](/blog/routing) for the three ways to do routes.
