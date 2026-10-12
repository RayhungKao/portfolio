# Canvas Desk — interactive portfolio prototype

A personal site where the portfolio is a desk: each piece of work is a card you can
drag, resize, and rotate. Cards snap to each other with alignment guides, and the
desk zooms and pans like a design tool. Click a card and the camera flies to it and
it opens into a full slide; flip between cards like a deck, and go back to the desk anytime.

Built with React, TypeScript, Vite, and Fabric.js 7.

## Run it

Requires Node.js 20.19+ or 22.12+ (`node -v` to check; on a Mac, `brew install node` works).

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
```

## Controls

| Action | How |
| --- | --- |
| Move a card | Drag it (it snaps to nearby cards) |
| Resize / rotate | Corner handles / top handle |
| Pan the desk | Drag empty space, or scroll with two fingers |
| Zoom | Pinch on a trackpad, ⌘/Ctrl + scroll, or the − / + buttons |
| Open a card | Click it: the camera flies in and the card opens as a slide |
| Flip between cards | ← / → keys, or the ‹ › buttons on the slide |
| Back to the desk | Esc, "← Back to the desk", clicking outside the slide, or the browser Back button |
| Reset layout | "Tidy up" |
| Plain list | "Skip to content" (default on screens under 768px) |

Card positions are saved in the browser (localStorage), so a visitor's layout
survives a reload until they press "Tidy up".

Each desk card is drawn from its slide's own layout, so a zoomed-in card and the opened
slide always match. A name label above each card stays the same size at any zoom.

Each open card has its own URL (`#/work/ai-agent`, `#/work/performance`, …), so you can
link straight to one; the page opens on the desk and flies to that card.

## Blog

The blog lives at `#/blog`. Each post is one plain-text file in `src/posts/`, written the
way you would write a LinkedIn post: line breaks are kept, a blank line starts a new
paragraph, URLs become links, and `#hashtags` are highlighted. The file name becomes the
post URL (`src/posts/cancel-flow.md` → `#/blog/cancel-flow`).

```text
---
title: What I learned building an AI agent's cancel flow
date: 2026-10-09
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:...
summary: Optional one-line teaser for the post list
---
Post body…
```

`title` and `date` (YYYY-MM-DD) are needed for a tidy list; `linkedin` adds a
"Discuss on LinkedIn" button; `summary` defaults to the first line of the post.

## Where things live

| File | What it holds |
| --- | --- |
| `src/content.ts` | Card text, colors, and links — edit content here; the desk card and the slide both update |
| `src/posts/*.md` | Blog posts |
| `src/postData.ts`, `src/Blog.tsx` | Loads posts and renders the blog list and post pages |
| `src/desk.ts` | Fabric.js desk: draws cards from measured layouts, snapping guides, zoom/pan, camera flights, persistence |
| `src/DeckContent.tsx` | The slide layout, plus the measuring that turns it into a desk card |
| `src/Slide.tsx` | The opened card: laid exactly over the zoomed card, cross-fades in and out |
| `src/App.tsx` | Page shell: top bar, desk/list toggle, routes, open/flip/close sequencing |
| `src/styles.css` | Color tokens and styles |
| `public/resume.pdf` | Résumé served by the "Résumé" button |
