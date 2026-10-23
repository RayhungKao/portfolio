---
title: "Deployment and environment setup: hosting, CI and environment variables"
date: 2026-10-18
summary: "Static hosting needs a fallback, cache headers and a base path; environment variables are public; CI runs the same steps every time."
series: web-frontend
order: 402
part: Ship it
draft: false
---

**What you'll learn:** the three settings static hosting needs, how environment variables work in Vite and Next.js, what a CI pipeline should contain, and a pre-release checklist.

Deployment starts with one question: is your output just files, or is there code that must run on every request?

![Where each kind of output is deployed](diagram:where-each-output-is-deployed)

The output of CSR and SSG is files, and a static host or CDN can serve them. SSR needs an environment that can run code, which is covered in [Where server code runs](/blog/running-server-code).

## Three things static hosting needs

- **History fallback.** With URLs like `/blog/my-post`, refreshing the page asks the server for that path, and the server has no such file. Configure "if no file is found, return `index.html`". The dev server does this for you, so you only meet the problem after release.
- **Cache headers.** Hashed files under `assets/*` can be cached for a long time as immutable. `index.html` should not be cached, or only briefly, so users get the HTML that points to the new file names.
- **Base path.** When deploying under a sub-path (for example `https://user.github.io/repo/`), set the build tool's `base`, and make the router handle the same prefix.

How common hosts set up the fallback:

| Host | How |
| --- | --- |
| Netlify | A line `/*  /index.html  200` in `public/_redirects` |
| Vercel | `rewrites` in `vercel.json` |
| GitHub Pages | No rewrites; the usual trick is to copy `index.html` to `404.html` after the build |

## Environment variables

```text
# .env
VITE_SITE_URL=https://example.com
```

```ts
const url = import.meta.env.VITE_SITE_URL
```

Vite only exposes variables starting with `VITE_` to client code, and it substitutes them directly into the output at build time. That makes them completely public to users: they are configuration, not secrets. Real secrets belong in a backend (see [When you need a backend](/blog/when-you-need-a-backend)). Do not commit local override files such as `.env.local`.

Moving from Vite to Next.js changes the names: client-visible variables start with `NEXT_PUBLIC_` instead, and they are also inlined at build time. Variables without the prefix stay on the server, which is why Next.js can hold secrets in server code and Vite cannot.

| | Vite | Next.js |
| --- | --- | --- |
| Visible to client code | `VITE_` prefix, read with `import.meta.env` | `NEXT_PUBLIC_` prefix, read with `process.env` |
| When the value is fixed | Build time | Build time (for client code) |
| Secrets | Not possible in client code | Server-only variables, no prefix |

## The CI/CD pipeline

```text
checkout → setup Node → install (frozen lockfile) → typecheck → build → deploy
```

- **Pin the Node version.** Vite 8 needs Node.js 20.19+ or 22.12+.
- **Strict install:** `npm ci`, `pnpm install --frozen-lockfile` or `yarn install --immutable`.
- **Type check:** `tsc --noEmit`. If your tsconfig uses project references, use `tsc -b`, otherwise `tsc --noEmit` at the root checks no files at all.

## When you need a server

SSR runs code on every request, so the deployment target must provide a runtime. That is why deploying an SSR framework is more involved than deploying static files, and why the next article exists.

## Pre-release checklist

- [ ] Node and package manager versions are pinned (`engines`, `packageManager`)
- [ ] CI installs with a frozen lockfile
- [ ] The type check really checks files
- [ ] The production build has been verified with `vite preview`
- [ ] The platform has the SPA fallback configured
- [ ] `base` matches the router's base path
- [ ] No secrets in any environment variable that reaches the client

> [!PRINCIPLE] Core principle
> First decide whether the output is files or code, then decide where to deploy it.
