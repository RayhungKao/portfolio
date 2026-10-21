---
title: "Routing: write it yourself, use a library, or file-system routing"
date: 2026-10-18
summary: "Routing maps a URL to a screen. A router is four jobs, and there are three ways to get them."
series: web-development
order: 302
part: The toolchain
draft: false
---

**What you'll learn:** the four jobs of a router, what they look like in code, the three ways to get them, and when to move up from hand-written routing.

Routing means mapping a URL to a screen. Three approaches exist, and they differ in cost and in the size of project they suit.

![A router is four jobs](diagram:router-four-jobs)

Matching turns the URL into a route. Rendering picks the component for that route. Subscription keeps the screen in sync when the URL changes without your code, for example when someone presses Back or Forward. Navigation is the reverse: a link click or your own code changes the URL, without reloading the page.

## Three approaches

| Approach | Example | Suits | Cost |
| --- | --- | --- | --- |
| Write it yourself | A route object plus a `switch` | Projects with very few routes | You handle history, scroll, link interception and base path |
| Router library | React Router, TanStack Router, wouter | Nested layouts, per-route code splitting, data loading | One more dependency; still client-side, so SEO depends on the rendering mode |
| File-system routing | Next.js, Nuxt, Astro, SvelteKit | When you use a framework | Routes are decided by folders and tied to the framework |

## The four jobs in code (hand-written)

| Job | What it looks like |
| --- | --- |
| Matching | `matchRoute(pathname)` turns a URL into a route object |
| Rendering | `renderRoute(route)` returns the matching component with a `switch` |
| Subscription | Listen to `popstate` and update state when the URL changes |
| Navigation | `history.pushState`, then notify the subscription; clicks on `<a>` must be intercepted |

Define routes as a discriminated union and TypeScript narrows on `route.name`. With an exhaustive check, adding a route and forgetting to handle it becomes a compile error:

```tsx
type Route =
  | { name: 'home' }
  | { name: 'blog'; category?: string }
  | { name: 'post'; slug: string }
  | { name: 'notFound' }

function renderRoute(route: Route) {
  switch (route.name) {
    case 'home':     return <Home />
    case 'blog':     return <BlogList category={route.category} />
    case 'post':     return <BlogPost slug={route.slug} />
    case 'notFound': return <NotFound />
    default: {
      const _exhaustive: never = route
      return _exhaustive
    }
  }
}
```

That was Rendering. The other three:

```tsx
// Matching: URL → route object
function matchRoute(pathname: string): Route {
  if (pathname === '/') return { name: 'home' }
  if (pathname === '/blog') return { name: 'blog' }
  const m = pathname.match(/^\/blog\/([^/]+)$/)
  if (m) return { name: 'post', slug: decodeURIComponent(m[1]) }
  return { name: 'notFound' }
}

// Subscription: update state when the URL changes (back, forward)
function useRoute(): Route {
  const [route, setRoute] = useState(() => matchRoute(location.pathname))
  useEffect(() => {
    const sync = () => setRoute(matchRoute(location.pathname))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  return route
}

// Navigation: change the URL, then notify the subscription
function navigate(path: string) {
  history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
```

## With Next.js, the framework handles all four

| Job | Hand-written | Next.js (App Router) |
| --- | --- | --- |
| Matching | `matchRoute()` | The folder structure: `app/blog/[slug]/page.tsx` matches `/blog/:slug` |
| Rendering | `switch` | The default export of that folder's `page.tsx` |
| Subscription | Listen to `popstate` | Handled inside the framework |
| Navigation | `pushState` and click interception | `<Link href>` and `useRouter().push()` |

There is no router configuration and no router library to install. The route is the folder:

```text
app/
├── page.tsx                → /
├── blog/
│   ├── page.tsx            → /blog
│   └── [slug]/page.tsx     → /blog/hello
└── not-found.tsx           → page not found
```

```tsx
// app/blog/[slug]/page.tsx
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <BlogPost slug={slug} />
}
```

```tsx
// Navigation: no click interception, no pushState
import Link from 'next/link'

<Link href="/blog/hello">Hello</Link>
```

Since Next.js 15, `params` is a Promise, so it has to be awaited (Next.js 16 removed the temporary synchronous access). For static pages (SSG), a dynamic route also needs `generateStaticParams()`.

## Pitfalls when you write it yourself

A hand-written router also has to handle scroll position, links opened in a new tab, non-ASCII slugs, and the base path when the site is deployed under a sub-path. Each is small, but together they are the cost listed in the table above.

## History mode or hash mode

A single-page app has one HTML file, but its URLs can look like many pages. There are two ways to write them.

- **History mode** (`/blog/my-post`): clean URLs. But if someone refreshes or opens that link directly, the browser asks the server for `/blog/my-post`, and no such file exists. The host has to be set up to answer unknown paths with the app's `index.html` (a fallback). See [Deployment and environment setup](/blog/deployment-and-env-setup).
- **Hash mode** (`/#/blog/my-post`): the browser never sends anything after the `#` to the server, so the server always returns `index.html` and needs no setup. The cost is uglier URLs, and the server cannot see the part after the `#`.

## Server-side routing also exists

Everything above is about the browser deciding which screen to show. A backend has its own router, with the same idea: a URL and an HTTP method map to a handler. `GET /orders/42` runs the function that returns order 42. The difference is what gets chosen. A frontend router decides **which component** to render; a backend router decides **which function** runs. Frameworks that do both, like Next.js, use the same folder-based idea for each. How the server side works is in [Inside a backend](/blog/inside-a-backend).

## When to move up

Move to a router library or framework when you need nested layouts, per-route code splitting, per-route data loading, or per-route error boundaries.

> [!PRINCIPLE] Core principle
> Routing looks like one `switch` but is four jobs. Write it yourself while routes are few, and move to a library or framework when the needs grow.
