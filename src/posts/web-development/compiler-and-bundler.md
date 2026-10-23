---
title: "Compiler and bundler: from TSX to files a browser can run"
date: 2026-10-18
summary: "A compiler rewrites one file at a time, a bundler reorganises the whole project, and they work as a relay."
series: web-frontend
order: 304
part: The toolchain
draft: false
---

**What you'll learn:** how the per-file compiler and the whole-project bundler divide the work, and which jobs belong to which.

A compiler looks at one file. A bundler looks at the whole project. They work in sequence to turn what you write into files the browser can run efficiently.

![The compiler works per file; the bundler works on the whole graph](diagram:compiler-then-bundler)

A compiler handles one file at a time, so it is fast and can run in parallel. A bundler needs the whole module graph before it can merge and optimise.

## Compiler: rewriting one file at a time

The browser only understands JavaScript, but you write TypeScript and JSX. A compiler rewrites each file as plain JavaScript. It changes the notation, not the behaviour:

```tsx
// Input
type Props = { name: string }
export function Hello({ name }: Props) {
  return <h1>Hi, {name}</h1>
}
```

```js
// Output
import { jsx as _jsx } from "react/jsx-runtime";
export function Hello({ name }) {
  return _jsx("h1", { children: ["Hi, ", name] });
}
```

It strips types, turns JSX into function calls, lowers new syntax for the target browsers, and in development injects the code React Refresh needs. It does not do type checking, merge files or add polyfills.

## Bundler: working on the whole graph

1. **Module graph:** starting from the entry file, follow every `import` to find all the modules in use.
2. **Tree-shaking:** remove exports that nothing uses.
3. **Code splitting:** at each dynamic `import()`, split that part into its own chunk, downloaded only when the page that needs it is entered.
4. **Minify and hash:** shorten the code and put a content hash in each file name. If the content has not changed, the name has not changed, so browsers can cache the file for a long time.

## Why two layers

A compiler needs nothing about other files, so it can be optimised and parallelised on its own. Tree-shaking and code splitting need to know which modules are used by whom, and only the bundler sees the whole graph.

## How React's code splitting relates to the bundler

React's `lazy` and `Suspense` do not replace the bundler. They are its front-end interface:

```tsx
const Resume = lazy(() => import('./Resume'))   // you mark the split point here
```

The split of work: `import()` is JavaScript syntax meaning "load this module later". Only when the bundler sees it does it put `Resume` and its exclusive dependencies in a separate chunk. React's `lazy` and `Suspense` decide what to show while it loads. You mark the split point, the bundler splits the file, and React manages the waiting screen.

React does not do the other three jobs either:

| The bundler's four jobs | Can React do it alone? |
| --- | --- |
| Module graph | No: the bundler resolves `import` |
| Tree-shaking | No: the bundler analyses it, but it can only do so when you write ES modules |
| Code splitting | Half: React's `lazy` marks the split point, the bundler splits the file |
| Minify and hash | No: handled by the bundler's minifier and output settings |

A framework such as Next.js splits code per route automatically, so you do not write `lazy` by hand.

## Common tools

| Layer | Tools |
| --- | --- |
| Compiler | Babel (JavaScript, the most plugins, the slowest), esbuild (Go), SWC (Rust, used by Next.js), Oxc (Rust, used by Vite 8) |
| Bundler | webpack, Rollup, esbuild, Rolldown (used by Vite 8), Turbopack (used by Next.js) |

esbuild does both jobs, so it appears in both rows.

## Two limits to know

- Because files are converted one at a time, TypeScript features that need information from other files (for example using a `const enum` across files) break. Turning on `isolatedModules` in `tsconfig.json` makes TypeScript report them early.
- Tree-shaking depends on static `import` and `export`. A module with side effects at load time cannot be safely removed, and a package can use the `sideEffects` field to tell the bundler.

> [!PRINCIPLE] Core principle
> A compiler rewrites one file; a bundler reorganises the whole project.
