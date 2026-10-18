---
title: "When the HTML is produced: CSR, SSG and SSR"
date: 2026-10-18
summary: "The three rendering modes differ in one thing, the moment the page HTML is produced, and that moment sets their costs."
series: web-development
order: 202
part: Needs to architecture
draft: true
---

**What you'll learn:** how the three rendering modes differ, what each one costs, and what hydration is.

The three rendering modes differ in one thing: **when the HTML is produced**.

![The three modes differ in when the page HTML is produced](diagram:when-html-is-produced)

Every row has one highlighted cell. That is the moment the page HTML actually comes into existence.

## CSR: client-side rendering

The HTML is an empty shell, and JavaScript builds the content inside the browser. Deployment is the simplest, because the output is only static files, and moving between pages feels smooth. The cost is that the first load waits for JavaScript, and a crawler that does not run it sees an empty shell, so SEO is weaker.

Typical use: dashboards, SaaS tools and creator tools. Example: the screens of an admin panel behind a login.

## SSG: static site generation

HTML is generated at build time, one file for each route. It is fast, cheap and good for SEO, and it needs no server. The cost is that content must be known at build time, so changing data means building again.

Typical use: blogs, documentation and portfolios. Example: this blog, where each post becomes an HTML file when the site is built.

## SSR: server-side rendering

The server generates the HTML on every request. Content is always current, can differ for each visitor, and is good for SEO. The cost is a server runtime that has to stay available, which means more money and more operations, and response time now depends on the server.

Typical use: product pages and social feeds. Example: a product page that shows today's stock and the logged-in user's name.

## Hydration

The HTML from SSG and SSR is static. For the page to react to clicks, JavaScript has to take over. That takeover is **hydration**.

| Term | Meaning | Where it happens |
| --- | --- | --- |
| Rendering | Turning a component into HTML or a visible screen. The general word. | Any of the three places |
| Pre-rendering | Producing the HTML before the user receives the page. SSG and SSR both do this. | Build time or server |
| Hydration | After the HTML is already on screen, JavaScript downloads, attaches to it, binds events and creates state, so the page can respond | Browser |

Rendering is the action, pre-rendering means doing it early, and hydration is the second step after doing it early.

![What the page looks like at each step, pre-rendered versus CSR](diagram:hydration-steps)

In the top row (SSG or SSR) the HTML arrives first, so content is visible quickly, but buttons do nothing until JavaScript has taken over. The CSR row has no hydration: the HTML is an empty shell and JavaScript builds the screen from nothing.

Concretely, the HTML already contains a button, but the button has no click handler. React runs the components again in the browser, compares them with the existing DOM and attaches events and state, instead of throwing the HTML away and drawing it again. The cost is downloading and running the JavaScript, which is why some frameworks only hydrate the parts that need interaction. Astro's islands are an example.

## Modes can be mixed

Different pages of one site can use different modes: the home page SSG, product pages SSR, the admin area CSR. Mixing them without effort is a big part of what a framework gives you.

## Rendering mode and the backend are two separate questions

Rendering mode answers where the HTML comes from. It does not answer where the data lives or who checks permissions, and the two vary independently.

With CSR or SSG, the browser gets the page files from a CDN. If the page needs data per user, JavaScript then calls a backend API, which reads the database and returns JSON.

![CSR and SSG: files from a CDN, data from an API](diagram:csr-ssg-request-flow)

With SSR, the backend produces the finished HTML itself, reading the database on the way, while the JavaScript and CSS still come from a CDN.

![SSR: the backend returns finished HTML](diagram:ssr-request-flow)

So "SSR" is one way of having a backend, not the only one. [Full stack or separate backend](/blog/full-stack-or-separate-backend) covers how to choose between the shapes.

> [!PRINCIPLE] Core principle
> Choosing a rendering mode means choosing at which moment the page HTML is produced: build time, request time or in the browser.
