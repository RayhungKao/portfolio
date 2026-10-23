---
title: "Static export: server code runs only at build time"
date: 2026-10-18
summary: "With output: 'export', the server in server components shrinks to the moment of the build. What that gives and what it gives up."
series: web-frontend
order: 503
part: Next.js in practice
draft: false
---

**What you'll learn:** when server components actually run in a static export, what the build produces, which server features disappear, and how `basePath` works for a sub-path deployment.

A Next.js project with `output: 'export'` has no Node.js running after it is deployed. The "server" in server components only means "a Node environment that runs JavaScript". It runs at the moment of `npm run build`, and the result is written to HTML files. That is SSG (see [CSR, SSG and SSR](/blog/csr-ssg-ssr)) as Next.js does it.

## When server components run

| When | Where | What happens |
| --- | --- | --- |
| `npm run build` | Your computer, or a CI machine such as GitHub Actions | Runs server components and writes the result to HTML files |
| `npm run dev` | The dev server on your computer | Runs on every request, to make development easy |
| After deployment | Nowhere | Users get the HTML computed at build time |

## What happens at build time

| Item | Result |
| --- | --- |
| Reading `src/posts/*.md` with `fs` | The content becomes the HTML of each post page; the `.md` files themselves are not shipped |
| `metadata`, `generateMetadata` | Each page's title and description are written into that page's `<head>` |
| `generateStaticParams` | Decides which URLs exist, one `.html` file for each |

You can check it directly: open `out/blog/some-post.html`. It contains the finished text of the post, not an empty shell to be filled in after the browser loads.

## What a static export gives up

Features that need a Node.js server, or that depend on the live request, are not available. Checked against the Next.js static export guide:

| Server mechanism | In a static export | Why |
| --- | --- | --- |
| Server Actions | Not supported | They are POST endpoints; nothing is running to receive the POST |
| `proxy.ts` | Not supported | It runs per request, before routing |
| Route Handlers | Only a `GET` that produces a fixed response at build time (`export const dynamic = 'force-static'`); none that read the request | Nothing can answer a different response per request |
| Cookies | Not supported | They belong to a request |
| `redirects`, `rewrites`, `headers` in `next.config` | Not supported | The host, not Next.js, serves the files, so it must apply them |
| Dynamic routes without `generateStaticParams`, or with `dynamicParams: true` | Not supported | The build must know every URL in advance |
| ISR (incremental static regeneration) | Not supported | It regenerates pages on a server |
| Image optimization with the default loader | Not supported (a custom loader works) | The default one resizes images on a server |
| Draft Mode | Not supported | It switches rendering per request |
| Intercepting Routes | Not supported | The guide lists them as unsupported without giving a reason |

Other consequences: content only updates by building and deploying again, and a URL that does not exist gets a real 404 page instead of falling back to the home page.

Without the static export, the same code can run on a real server (Vercel, for example), and server components run when a request arrives. Which of these mechanisms you need, and what hosting they imply, is in [Full-stack framework or a separate backend](/blog/full-stack-or-separate-backend).

## Deploying under a sub-path: basePath

A GitHub Pages project site lives at `https://account.github.io/project/`, not at the domain root. Set `basePath: '/project'` and Next.js adds the prefix to links and assets. Things to watch:

- The prefix comes from an environment variable (`BASE_PATH` in this portfolio), supplied in CI by the Pages configuration. With a custom domain the prefix becomes an empty string automatically, so the code does not change.
- Links and assets that Next.js generates itself (`<Link>`, `next/image` with a loader) get the prefix. A hand-written `<a href>` and URLs of files in `public/` do not, so put them through one helper.
- When client code needs the prefix, inline it with the `env` option in `next.config.ts`, using a name that starts with `NEXT_PUBLIC_`.

The deployment pipeline and environment setup are in [Deployment and environment setup](/blog/deployment-and-env-setup).

> [!PRINCIPLE] Core principle
> A static export shrinks "the server" to the moment of the build. Whatever can be computed then should not be left for the visitor's browser.

Next: [Migrating a Vite SPA to Next.js](/blog/migrating-vite-spa-to-next).
