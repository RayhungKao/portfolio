---
title: "Package managers: npm, Yarn and pnpm"
date: 2026-10-18
summary: "All three read package.json, download dependencies and write a lockfile. They differ in how dependencies land in your project."
series: web-development
order: 305
part: The toolchain
draft: false
---

**What you'll learn:** how dependencies end up on disk, what a lockfile does, and the safety defaults that have converged.

npm, Yarn and pnpm all do the same thing: read `package.json`, download the dependencies and write a lockfile. The difference is how the dependencies end up in your project.

![node_modules layouts: npm versus pnpm](diagram:node-modules-layouts)

On the left, each project has its own full `node_modules`. On the right, pnpm keeps one copy in a global store and projects link to it.

## What all three do

Read `package.json`, download the dependencies, put them in `node_modules`, write a lockfile, then run scripts. The lockfile records the exact version of every package, so every machine and every install gives the same result.

## The difference: what `node_modules` looks like

| | npm | Yarn Classic (v1) | Yarn Berry (v2 to v4) | pnpm |
| --- | --- | --- | --- | --- |
| Ships with Node | Yes | No | No | No |
| How dependencies land | A flat `node_modules`, one copy per project | Same as npm | PnP by default (no `node_modules`), can be switched back | A global store plus links |
| Lockfile | `package-lock.json` | `yarn.lock` | `yarn.lock` | `pnpm-lock.yaml` |
| Strict install for CI | `npm ci` | `yarn install --frozen-lockfile` | `yarn install --immutable` | `pnpm install --frozen-lockfile` |
| Phantom dependencies | Yes | Yes | Not under PnP | Not by default |

## Phantom dependencies

Your code imports a package that is not declared in `package.json`. It only works by chance, because another package depends on it and it was hoisted to the top. npm lets it succeed quietly. pnpm fails by default, so you find the problem early.

```ts
// package.json declares only express, not qs
import qs from 'qs'   // happens to work under npm; under pnpm: Cannot find module
```

## Safety defaults have converged

npm 12 does not run the lifecycle scripts of dependencies by default and blocks Git and remote URL dependencies. pnpm has done the same since v10 and Yarn since 4.14. Packages that need scripts are approved with `npm approve-scripts --allow-scripts-pending`. pnpm also has `minimumReleaseAge`, which delays adopting a version that was just published.

## Practical advice

- Use only one per project, and commit the lockfile. The three lockfiles are not interchangeable.
- Use strict installs in CI, so a mismatch between dependencies and lockfile fails instead of silently updating.
- Pin the version with the `packageManager` field in `package.json`. Yarn and pnpm usually go with Corepack. From Node.js 25, Corepack no longer ships with Node and has to be installed separately with `npm install -g corepack`.
- npm needs no setup. pnpm is strict, saves disk space and supports monorepos well. Yarn Berry's PnP has no `node_modules`, so it can clash with tools that assume the folder exists.

> [!PRINCIPLE] Core principle
> The difference is the structure of `node_modules`. Pick one per project and use strict installs in CI.
