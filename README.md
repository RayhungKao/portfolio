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
HTML file per URL into `out/`, so there is no SPA fallback: an unknown URL gets `404.html`, built
from `app/not-found.tsx`. The Work page's canvas lives in `app/work/layout.tsx` so it stays mounted between `/work` and
`/work/<id>`.

The build's base path comes from the Pages settings (`/portfolio/` now). In code, write app
paths (`/blog/x`) and link with `next/link` (or `AppLink` for hrefs that may be external); both
add the base path. Public files go through `asset()` from `src/router.ts`.

To move to a custom domain later: verify the domain in your GitHub account settings, enter
it under Settings → Pages → Custom domain, then add the DNS records GitHub shows. The base
path then becomes `/` automatically, and no `CNAME` file is needed with an Actions deployment.
The workflow also passes the site's origin (`SITE_ORIGIN`), so the sitemap, canonical URLs and
share previews switch to the new domain along with it.

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

## Analytics

Google Tag Manager loads Google Analytics 4; Search Console is verified with a meta tag. The site
reads their IDs at build time, so nothing is loaded in `npm run dev` or in a build without them.
Post pages, post lists and the home footer show all-time views from GA4, fetched before each build
by `scripts/fetch-views.mjs`; the workflow also rebuilds daily so the counts stay current.

Set these under Settings → Secrets and variables → Actions:

| Name | Kind | Where to find it |
| --- | --- | --- |
| `GTM_ID` | Variable | GTM container ID, `GTM-XXXXXXX` |
| `GSC_VERIFICATION` | Variable | Search Console, HTML tag method: the `content` value |
| `GA4_PROPERTY_ID` | Variable | GA4 Admin → Property details: the numeric ID (not `G-…`) |
| `GA4_CREDENTIALS` | Secret | The whole JSON key of the service account below |

One-time setup:

1. **GA4**: create a property and a Web data stream for the site URL. Keep Enhanced measurement on,
   including "Page changes based on browser history events": client-side navigation is counted as
   page views with no code. Note the measurement ID (`G-…`).
2. **GTM**: create a Web container. Add a "Google tag" with the `G-…` ID, triggered on All Pages, and
   publish. To count contact clicks, add a "Just Links" trigger (Click URL starts with `mailto:`, or
   contains `linkedin.com`) with a GA4 Event tag, for example `contact_click`. Do not also install
   gtag.js on the site, or every view counts twice.
3. **Search Console**: add a URL-prefix property for the site URL, pick the HTML tag method, set
   `GSC_VERIFICATION`, deploy, then press Verify. Submit `sitemap.xml` under Sitemaps.
4. **View counts**: in Google Cloud, enable the Google Analytics Data API, create a service account,
   and add a JSON key. In GA4 Admin → Property access management, add the service account's email
   as a Viewer. Store the key as `GA4_CREDENTIALS`.

If the GA4 request fails, a push still deploys (without counts), while the daily run fails before
deploying, so the live site keeps its last counts. Scheduled workflows stop after 60 days without
commits; re-enable it on the Actions tab if so.
Visitors with ad blockers are not counted, so the numbers run low.

## Theme

Light (warm paper) is the default. The ☾ / ☀ button in the top bar switches to the dark
navy theme, and the choice is remembered in localStorage. All colors are CSS variables in
`src/styles.css` (`:root` for light, `:root[data-theme="dark"]` for dark). A small script in
`app/layout.tsx` applies the saved theme before the page renders, so there is no flash.

## Blog

The blog lives at `/blog`, and each category has its own page (`/blog/category/ai-agent`).
Each post is one Markdown file in `src/posts/` (GitHub-flavored: lists, tables, code, links).
A single line break stays a line break, the way you would write a LinkedIn post, a blank
line starts a new paragraph, and `#hashtags` are highlighted. The front matter is YAML, so
quote a value that contains `: ` (`title: "Foo: bar"`). Optional keys: `summary`, `image`
(PNG in `public/` for the share preview), `draft: true`, `linkedin` / `threads` / `instagram` (the
"Discuss on…" buttons), and `series: <slug>` with `order: <n>` to put a post in a series. A series
shows as one card in the blog list and has a contents page at `/series/<slug>`; give it a title and
description in `src/series.ts`. A post in a series has no `category` (the build fails if it sets one):
the series is where it is listed. The file name becomes the post URL (`src/posts/cancel-flow.md` →
`/blog/cancel-flow`). Files can sit in subfolders such as `src/posts/web-development/`, which only
group them: the URL is still the file name alone, so a name must be unique across all folders.

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
the sidebar directory (the order of categories is `CATEGORY_ORDER` in `src/postTypes.ts`;
posts without one go under "Notes"); `linkedin` adds a "Discuss on LinkedIn" button;
`summary` defaults to the first line of the post. Reading time and tags are computed
from the body.

## Where things live

| File | What it holds |
| --- | --- |
| `src/content.ts` | Card text, colors, and links — edit content here; the desk card and the slide both update |
| `src/posts/**/*.md` | Blog posts (subfolders group a series) |
| `src/Home.tsx` | Home page: intro, prompt box, avatar, selected work, latest posts |
| `src/postData.ts`, `src/Blog.tsx` | Loads posts, categories, reading time; renders the sidebar directory, lists, and post pages |
| `src/desk.ts` | Fabric.js desk: draws cards from measured layouts, snapping guides, zoom/pan, camera flights, persistence |
| `src/DeckContent.tsx` | The slide layout, plus the measuring that turns it into a desk card |
| `src/Slide.tsx` | The opened card: laid exactly over the zoomed card, cross-fades in and out |
| `src/Logo.tsx`, `public/favicon.svg` | The R mark: the top-bar logo (follows the theme) and the browser-tab icon |
| `app/` | Routes and the root layout (`layout.tsx`); `app/work/layout.tsx` keeps the canvas mounted |
| `src/router.ts`, `src/RouterBridge.tsx` | `asset()`, `to()` and `navigate()` for code outside components; `RouterBridge` connects `navigate()` to the App Router |
| `src/Topbar.tsx`, `src/WorkStage.tsx` | Top bar and theme toggle; desk/list view, open/flip/close sequencing |
| `src/styles.css` | Theme tokens and styles |
| `src/resumeData.ts`, `src/Resume.tsx` | Résumé text and the `/resume` page; edit the text in `src/resumeData.ts` |
