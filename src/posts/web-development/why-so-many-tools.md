---
title: "Why there are so many tools: from script tags to the toolchain"
date: 2026-10-18
summary: "Modules, packages, compilers, bundlers and frameworks appeared one after another, each fixing the last one's problem."
series: web-development
order: 103
part: The map
draft: false
---

**What you'll learn:** why modules, packages, compilers, bundlers and frameworks appeared one after another, and how to read the toolchain as one chain instead of a pile of names.

The list of tools looks overwhelming until you notice that each one exists because the previous one left a problem behind.

![The toolchain as a chain of problems](diagram:toolchain-chain)

The order is logical, not strictly historical. Each box is the subject of a later article.

## 1. Script tags

The first way to add JavaScript is a `<script>` tag. Every file shares one **global scope**. Two files that both define `user` overwrite each other, and the load order matters. It works for ten lines and breaks at ten files.

## 2. ES modules

`import` and `export` give every file its own scope. You expose only what you choose to. Example: `import { formatDate } from "./date.js"` pulls in one function without touching anything else.

## 3. Package manager

Once code is split into modules, you want to reuse other people's modules and keep their versions consistent. A package manager such as npm downloads them and records exact versions in a lockfile. See [Package managers](/blog/package-manager).

## 4. Compiler

Browsers do not run TypeScript or JSX, and new syntax reaches browsers at different speeds. A compiler turns what you write into JavaScript browsers understand. Example: TSX becomes plain JavaScript. See [Compiler and bundler](/blog/compiler-and-bundler).

## 5. Bundler

Hundreds of small modules mean hundreds of requests, and a lot of unused code. A bundler merges them into a few optimized files. See [Compiler and bundler](/blog/compiler-and-bundler).

## 6. Framework

Even with all of the above, every project still has to decide how URLs map to pages, how data loads and where rendering happens. A framework supplies those conventions. See [UI library and framework](/blog/ui-library-and-framework) and [Routing](/blog/routing).

## The tools get bundled

In practice you rarely choose each tool. A build tool such as Vite or webpack contains the compiler and bundler. A framework such as Next.js contains a build tool. Knowing the chain tells you which layer you are standing in when something breaks.

> [!PRINCIPLE] Core principle
> The toolchain is a chain of "this fixed a problem, which created the next one". Each later article covers one link.
