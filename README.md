# Canvas Desk — Ray Kao's personal site

A personal site with four pages:

| Page | URL | What it is |
| --- | --- | --- |
| Home | `/` | "Hello, I'm Ray", a short intro, a prompt box that jumps to matching work or posts, selected work, and the latest posts. The avatar photo turns into the illustrated version on hover or tap |
| Work | `/work` | The interactive canvas described below |
| Blog | `/blog` | Posts grouped by category, with a two-level sidebar directory |
| Résumé | `/resume` | The résumé as a web page (there is no PDF in the repo) |

On the Work page the portfolio is a desk: each piece of work is a card you can
drag, resize, and rotate. Cards snap to each other with alignment guides, and the
desk zooms and pans like a design tool. Click a card and the camera flies to it and
it opens into a full slide; flip between cards like a deck, and go back to the desk anytime.

Built with Next.js (App Router, static export), React, TypeScript, and Fabric.js 7.

## Run it

Requires Node.js 20.9+ (`.nvmrc` pins 22) (`node -v` to check; on a Mac, `brew install node` works).

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build     # type-check and build the static site to out/
```

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). One-time setup: in the repository's Settings → Pages,
set Source to "GitHub Actions". The repository is `portfolio`, so the site is served at
https://rayhungkao.github.io/portfolio/.

Pages are Next.js App Router routes under `app/`, and the build (`output: 'export'`) writes one
HTML file per URL into `out/`, so there is no SPA fallback: an unknown URL gets GitHub Pages' own
404. The Work page's canvas lives in `app/work/layout.tsx` so it stays mounted between `/work` and
`/work/<id>`.

The build's base path comes from the Pages settings (`/portfolio/` now). In code, write app
paths (`/blog/x`) and pass internal hrefs through `to()` and public files through `asset()`,
both from `src/router.ts`, so links keep working under any base path.

To move to a custom domain later: verify the domain in your GitHub account settings, enter
it under Settings → Pages → Custom domain, then add the DNS records GitHub shows. The base
path then becomes `/` automatically, and no `CNAME` file is needed with an Actions deployment.

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
| Plain list | "List view" (default on screens under 768px) |

Card positions are saved in the browser (localStorage), so a visitor's layout
survives a reload until they press "Tidy up".

Each desk card is drawn from its slide's own layout, so a zoomed-in card and the opened
slide always match. A name label above each card stays the same size at any zoom.

Each open card has its own URL (`/work/ai-agent`, `/work/performance`, …), so you can
link straight to one; the page opens on the desk and flies to that card.

## Theme

Light (warm paper) is the default. The ☾ / ☀ button in the top bar switches to the dark
navy theme, and the choice is remembered in localStorage. All colors are CSS variables in
`src/styles.css` (`:root` for light, `:root[data-theme="dark"]` for dark). A small script in
`index.html` applies the saved theme before the page renders, so there is no flash.

## Blog

The blog lives at `/blog`, and each category has its own page (`/blog/category/ai-agent`).
Each post is one plain-text file in `src/posts/`, written the way you would write a
LinkedIn post: line breaks are kept, a blank line starts a new paragraph, URLs become
links, and `#hashtags` are highlighted. The file name becomes the post URL
(`src/posts/cancel-flow.md` → `/blog/cancel-flow`).

```text
---
title: What I learned building an AI agent's cancel flow
date: 2026-10-09
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:...
category: AI Agent
summary: Optional one-line teaser for the post list
---
Post body…
```

`title` and `date` (YYYY-MM-DD) are needed for a tidy list; `category` places the post in
the sidebar directory (the order of categories is `CATEGORY_ORDER` in `src/postData.ts`;
posts without one go under "Notes"); `linkedin` adds a "Discuss on LinkedIn" button;
`summary` defaults to the first line of the post. Reading time and tags are computed
from the body.

## Where things live

| File | What it holds |
| --- | --- |
| `src/content.ts` | Card text, colors, and links — edit content here; the desk card and the slide both update |
| `src/posts/*.md` | Blog posts |
| `src/Home.tsx` | Home page: intro, prompt box, avatar, selected work, latest posts |
| `src/postData.ts`, `src/Blog.tsx` | Loads posts, categories, reading time; renders the sidebar directory, lists, and post pages |
| `src/desk.ts` | Fabric.js desk: draws cards from measured layouts, snapping guides, zoom/pan, camera flights, persistence |
| `src/DeckContent.tsx` | The slide layout, plus the measuring that turns it into a desk card |
| `src/Slide.tsx` | The opened card: laid exactly over the zoomed card, cross-fades in and out |
| `src/Logo.tsx`, `public/favicon.svg` | The R mark: the top-bar logo (follows the theme) and the browser-tab icon |
| `app/` | Routes and the root layout (`layout.tsx`); `app/work/layout.tsx` keeps the canvas mounted |
| `src/router.ts`, `src/RouterBridge.tsx` | Base-path-aware links (`to()`, `asset()`) and a bridge from `<a href>` clicks to the App Router |
| `src/Topbar.tsx`, `src/WorkStage.tsx` | Top bar and theme toggle; desk/list view, open/flip/close sequencing |
| `src/styles.css` | Theme tokens and styles |
| `src/resumeData.ts`, `src/Resume.tsx` | Résumé text and the `/resume` page; edit the text in `src/resumeData.ts` |
