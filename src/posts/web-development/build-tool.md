---
title: "Build tools: Vite, webpack and Turbopack"
date: 2026-10-18
summary: "A build tool is what shows you results while you code and produces files before you ship. The dev server and the build do different things."
series: web-frontend
order: 303
part: The toolchain
draft: false
---

**What you'll learn:** what the dev server and the build each do, why they behave differently, and what HMR is.

A build tool is what lets you **see results while you write code** and **produces the files you deploy**. Vite, webpack and Turbopack mostly differ in how they work during development.

![Development versus build](diagram:dev-vs-build)

On the left, development processes only the files that are requested. On the right, the build processes the whole project at once. The goals differ, so the behaviour differs.

## Two modes, two goals

- **Development:** edit the code and see the result immediately.
- **Build:** produce the smallest, fastest files.

## The main build tools

| Tool | Position | Notes |
| --- | --- | --- |
| Vite | Dev server plus build; not tied to one framework | The base of frameworks such as Nuxt, SvelteKit and Astro; since Vite 8 it runs on Rolldown and Oxc |
| webpack | The veteran bundler with very flexible configuration | Also bundles during development, so large projects start more slowly |
| Turbopack | The bundler built into Next.js | Mainly used inside Next.js |
| Rolldown / Rollup / esbuild | A bundler or its engine | Usually wrapped by a tool like Vite, rarely used directly |

## Why Vite's dev server is fast

It does not bundle the source up front. The browser requests files one by one as native ES modules, and the server transforms just the requested file on the spot. Dependencies, which rarely change, are pre-bundled once (pre-bundling), because some packages ship as CommonJS or contain hundreds of small internal modules. When you edit a file, only that module is updated (HMR).

## What HMR is

HMR (Hot Module Replacement) means that when you save, the dev server only tells the browser "this module changed". The browser downloads that one module and swaps the old version for the new one without reloading the page.

| | Without HMR | With HMR |
| --- | --- | --- |
| After saving | The whole page reloads | Only the changed module is replaced |
| State on the page (typed input, an expanded menu) | Lost | Kept where possible |

HMR in React projects is implemented by React Refresh, so after you edit a component its state is usually still there.

## If everything is an ES module from the start, is CommonJS still a problem?

Not for code you write: a file using `import` and `export` is an ES module (introduced in ES2015, often called ES6 modules). The problem comes from dependencies. Some packages on npm still ship only CommonJS (`require` and `module.exports`), or ship both. In development the browser only accepts ES modules, so Vite converts those CommonJS packages to ES modules during pre-bundling. New packages mostly ship ES modules, so this happens less and less, but old packages remain.

## Dev and build are not identical

Development does not bundle and the build does, so modules load differently. Before releasing, check the production build locally with `vite preview`.

## Type checking is not the build tool's job

A compiler only strips types and does not check them. Type checking belongs to `tsc`, usually run in the editor and in CI.

> [!PRINCIPLE] Core principle
> Development optimises for fast feedback and the build optimises for output quality, so one tool does different things in each mode.
