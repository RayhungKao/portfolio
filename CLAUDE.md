# Portfolio site (rayhungkao.github.io/portfolio)

Personal site: Next.js 16 App Router, static export (`output: 'export'`), React 19, TypeScript,
Fabric.js desk on /work. Deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Commands
- `npm run dev`: dev server at http://localhost:3000/ (no /portfolio prefix; drafts are visible)
- `BASE_PATH=/portfolio npm run build`: production build into `out/`, as deployed. `dev` hides some
  problems (drafts, base path, empty `generateStaticParams`), so build before pushing.
- Node 20.9+ (`.nvmrc` pins 22). There is no test suite. Verify with a build, then drive the built
  `out/` in a headless browser (serve it under /portfolio).
- Build in the real content state. Test-only posts (for example fake series posts) can hide failures
  that appear when the content is absent; remove them before the final build.

## Static export rules
- Nothing runs after deploy: no middleware, rewrites, redirects or language auto-detect. "Server"
  code means Node at build time.
- Every dynamic route needs a non-empty `generateStaticParams()` and `dynamicParams = false`; an
  empty list fails the build. `/series/[slug]` emits a placeholder `/series/none` (a 404 page, not
  linked, noindex) while no post has `series:`. That is intentional.
- Unknown URLs get `404.html` (from `app/not-found.tsx`).
- `images.unoptimized` stays on: the Next image optimizer needs a server.

## Code map and gotchas
- `src/postData.ts` is server-only (uses `fs`). Client components import types and helpers from
  `src/postTypes.ts` and receive `POST_LIST` (posts without bodies) as props.
- `app/work/layout.tsx` owns the Fabric canvas so it survives /work <-> /work/<id>; page files there
  return `null`. Load it through `src/WorkStageLoader.tsx` (`ssr: false` must live in a client file).
- Links: `next/link`, or `AppLink` when an href may be external. Files in `public/` go through
  `asset()` from `src/router.ts`. Never hard-code `/portfolio`.
- `navigate()` (router.ts) is for code outside React components; `RouterBridge` wires it up.
- Icons: edit `src/icons/*.svg`, then run `node scripts/gen-icons.mjs` (no `?raw` in Next).
- Analytics: GTM (which loads GA4) and the Search Console tag come from env vars in `app/layout.tsx`;
  view counts come from `views.json`, written by `scripts/fetch-views.mjs` (prebuild) and read by
  the server-only `src/viewData.ts`. All are unset locally, so builds show no counts. Setup: README.
- `src/remarkHashtags.ts` must return an `emphasis` node; a `text` node makes findAndReplace drop
  the text after the first match.

## Posts (src/posts/**/*.md)
- Markdown (GFM). Single newlines render as line breaks (remark-breaks). File name = URL slug; subfolders
  (for example `src/posts/web-development/`) only group files, and a duplicate file name fails the build.
- Front matter is YAML: quote values containing `: ` (`title: "Foo: bar"`).
- Keys: title, date, category, summary, linkedin, threads, instagram, image (PNG in public/),
  draft, series + order (a series post needs a unique `order`; the build fails otherwise), part.
- A post in a series has no `category`: it is listed under its series (`/series/<slug>`), not in the
  sidebar categories. Setting both fails the build.
- Series titles/descriptions live in `src/series.ts`. A series is one card in the list.
- Share images are generated per post at build time; `image:` overrides.
- `scripts/check-links.mjs` (prebuild) fails the build on a link to a missing or draft post, a missing
  series, or a `#anchor` with no matching heading, so renaming a heading means fixing its links.
- Hashtags (`#Tag`) count only after a space or at a line start, so a link's `#anchor` is not a tag.

## Content rules
- Do not add empty Work cards; add one only when there is real content.
- English at the root URLs; Chinese goes under /zh (not built yet). Chinese share images will need
  a bundled CJK font passed to ImageResponse.
- Exception: a post can carry a Chinese translation in `src/posts-zh/<slug>.md` (front matter `title`,
  then the body). The post page renders both and a 中文 / English button switches them (saved in
  localStorage as `post-lang`). Translate only; extra discussion goes elsewhere, not into the zh file.
- Every new post outside the web-frontend and web-backend series is tied to a system Ray built or ran,
  and answers these four questions. Before drafting, check the material against them; if one has no
  answer yet, ask Ray rather than fill it in.
  1. Who had the problem, and what did it cost them?
  2. What were the options, and why this one?
  3. What happened once it shipped, in numbers (volume, cost, latency)? If nothing is measured yet,
     say how it is measured and what it shows so far.
  4. What broke, and how was it fixed? If nothing has broken yet, say what is expected to break
     first and how it is watched.
- No new generic explainer posts outside those two series. The web-frontend and web-backend series are
  generic explainers by design: they can gain new articles, which need no tie to Ray's systems.
