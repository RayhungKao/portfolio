---
title: "UI library and framework: how React, Vue, Next.js and Astro relate"
date: 2026-10-18
summary: "A UI library draws the screen, a framework runs the whole site, and they are different layers rather than rivals."
series: web-development
order: 301
part: The toolchain
draft: false
---

**What you'll learn:** where the line between a UI library and a framework sits, how to choose each, and how to read market numbers without misreading them.

A UI library decides **how a screen is built**. A framework decides **how the whole site works**. They are different layers, not substitutes.

![A framework wraps a UI library and adds the rest of the site](diagram:ui-library-in-framework)

A framework wraps a UI library and adds routing, rendering modes, data loading and build configuration. Without a framework you assemble all of those yourself.

## UI library: how the screen is built

A UI library handles components, state and updating the screen. The table lists common reputations, which are impressions rather than verdicts.

| Option | What it is usually known for |
| --- | --- |
| React | Largest ecosystem, the most packages and jobs |
| Vue | Gentle learning curve, a complete set of official companions |
| Svelte | Compiles at build time, compact syntax |
| Solid | Fine-grained updates, syntax close to React |

## Framework: how the whole site works

| Framework | UI library | Position |
| --- | --- | --- |
| Next.js | React | Full stack, SSR and SSG, file-based routing |
| Nuxt | Vue | The full-stack framework for Vue |
| SvelteKit | Svelte | The full-stack framework for Svelte |
| Astro | Several | Content sites first, static HTML by default |
| React Router (framework mode) | React | Built on Vite, with SSR and pre-rendering options |

## When you need a framework

You need one when you want SSG or SSR, file-based routing, API routes or SEO. A logged-in app (a SPA) needs only a UI library and a build tool.

## Choosing a UI library

Team familiarity, ecosystem (packages and people) and which framework you want to pair it with usually matter more than performance differences. If you already want Next.js, the library question is answered: React.

## Reading the market numbers

State of JavaScript 2025 (about 12,000 respondents, skewed toward active developers) shows Next.js used by about 59% and Vite by about 84%. They are not competitors. Vite is a build tool, and also sits underneath frameworks such as Nuxt, SvelteKit and Astro. Next.js is a framework. In the same survey about 17% of Next.js users were negative about it, and the usual complaints were complexity and a feeling of dependence on Vercel.

> [!PRINCIPLE] Core principle
> Let rendering needs decide whether you need a framework, then pick the UI library by team and ecosystem.
