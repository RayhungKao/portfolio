---
title: "Develop, build, deploy: the life of a project"
date: 2026-10-18
summary: "A project passes through install, development, build and deployment, and each stage optimizes for a different goal."
series: web-development
order: 401
part: Ship it
draft: true
---

**What you'll learn:** what the four stages of a project are, what each one optimizes for, and the blind spot that makes "it works on my machine" a bug report.

From first install to going live, a project passes through four stages in order. Each has its own goal, so the same tool behaves differently in different stages.

![Each stage optimizes for a different goal](diagram:project-lifecycle-stages)

The tools from the earlier articles all fit in these four boxes: the package manager in Install, the dev server in Development, the bundler and compiler in Build, hosting and CI in Deployment.

## Install: get the dependencies

Commands such as `npm install` read `package.json`, download the dependencies and write the lockfile. In CI, use a strict install, which fails when the lockfile and `package.json` disagree. See [Package managers](/blog/package-manager).

## Development: see the change at once

The dev server transforms each requested file one at a time, and when you edit a file only that module is updated (HMR). This stage does no type checking and no bundling. See [Build tools](/blog/build-tool).

## Build: the smallest, fastest files

The bundler works on the whole project: merging, tree-shaking, code splitting, minifying and adding hashes, and writes the result to `dist/`. Before releasing, check it with `vite preview`, because development and build load modules differently. See [Compiler and bundler](/blog/compiler-and-bundler).

## Deployment: put the files where users can get them

Put `dist/` on a host. Static files go to a static host or a CDN. Anything that must run code goes to an environment with a runtime. CI usually does it automatically: checkout, install, typecheck, build, deploy. The next article, [Deployment and environment setup](/blog/deployment-and-env-setup), goes through it.

## A common blind spot

A smooth Development stage does not mean the Build will pass, and a passing Build does not mean the Deployment is correct. Examples: a type error that the dev server never checked, a module that loads in development but is dropped in the bundle, a Node version on CI that differs from yours. So the pipeline needs a type check, a production build check, and a pinned environment (the Node and package manager versions).

> [!PRINCIPLE] Core principle
> One project, four stages, four different goals.
