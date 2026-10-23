---
title: "Where code runs: build time, server and browser"
date: 2026-10-18
summary: "Every technical choice decides whether code runs at build time, on a server or in the browser."
series: web-frontend
order: 102
part: The map
draft: false
---

**What you'll learn:** the three places code can run, what each one can and cannot do, and why this question sits underneath almost every choice in web development.

How should a page be rendered? Where should a form be validated? Questions like these come down to one thing: **when and where** does the work happen? At build time, on a server, or in the browser.

## Three spots

Build time is a moment: once, before release, on your machine or in CI. The server and the browser are places. Read the picture left to right as the order things happen.

![Build time, server and browser compared](diagram:where-code-runs)

### 1. Build time

Code that runs once while you prepare a release. It can compile TypeScript, generate HTML files and optimize images. It cannot know who will visit, because nobody has yet.

Example: a blog generator reads 200 Markdown files and writes 200 HTML pages before you deploy.

### 2. Server

Code that runs when a request arrives. It can query a database, read secrets such as API keys, and decide what each user may see. Someone has to keep it available, either you with a machine or a cloud provider that starts it on demand. It cannot react to a click by itself, because it only speaks when asked.

Example: `GET /orders` checks who is logged in and returns that person's orders from a database. If your app needs to keep data or secrets, read [When you need a backend](/blog/when-you-need-a-backend).

### 3. Browser

Code that runs on the visitor's device while the page is open. It can react to clicks, draw on a canvas and keep small things in `localStorage`. Everything sent to it is public: the code can be read, and the data can be inspected. So the browser cannot hold secrets.

Example: a drawing app that follows the mouse and paints on a `<canvas>`.

## Why this matters

**Rendering modes are an answer to this question.** A single-page app (SPA) does most of the work in the browser. Static site generation (SSG) does it at build time. Server-side rendering (SSR) does it on the server. [CSR, SSG and SSR](/blog/csr-ssg-ssr) compares them.

**Objects exist only in some places.** `window`, `document` and canvas exist in the browser. At build time and on the server, you run in Node.js, where they do not exist. Code that touches `window` at the top of a file crashes the build.

## Server versus browser

| | Server | Browser |
| --- | --- | --- |
| Who provides and runs it | You or a cloud provider | The user's device |
| How many people it serves | Shared by everyone | One copy per open tab |
| Can it be trusted | Mostly: you control the code | No, users can change anything |
| What it can reach | Databases, files, internal services | The DOM, canvas, `localStorage`, user actions |
| Who pays for the compute | You | The user's device |
| When it exists | Always on, or started on demand | While the page is open (a Service Worker is the exception) |

> [!PRINCIPLE] Core principle
> For each piece of work, decide when and where it runs: build time, server or browser. That choice decides what the code can reach, who can see it, and who pays for it.
