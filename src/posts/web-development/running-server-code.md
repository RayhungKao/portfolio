---
title: "Where server code runs: VPS, containers, PaaS and serverless"
date: 2026-10-18
summary: "Four ways to run code on every request, and what you manage in each."
series: web-development
order: 403
part: Ship it
draft: false
---

**What you'll learn:** what a VPS, a container, a PaaS and serverless each are, who manages what in each, and how real projects mix them.

Static files need only a host. Code that runs on every request needs a **runtime**: a place that starts your program, keeps it healthy and gives it a network address. There are four common ways to get one.

## The four options

| Option | What it is | Example |
| --- | --- | --- |
| VPS | A rented virtual Linux machine. You install and run everything on it. | A DigitalOcean droplet running Node behind Nginx |
| Container | Your app and its dependencies packed in an image that runs the same anywhere. It is a packaging format, not a host: a container still has to run somewhere. | A Dockerfile, run on a VPS or on a platform |
| PaaS | A platform that builds and runs your app from a Git push or an image, and handles restarts and HTTPS. | Render, Railway, Fly.io |
| Serverless | Small functions that the platform starts per request and stops afterwards, billed per execution. | Vercel Functions, AWS Lambda, Cloudflare Workers |

A Dockerfile for a small Node API shows what "packing" means:

```dockerfile
FROM node:22-slim          # start from an image that already has Node
WORKDIR /app               # work inside /app
COPY package*.json ./      # copy the dependency list first, so the next step can be cached
RUN npm ci --omit=dev      # install dependencies once, at image build time
COPY . .                   # then copy the source
CMD ["node", "server.js"]  # what the container runs when it starts
```

## Who manages what

![Who manages what on a VPS, a PaaS and serverless](diagram:vps-paas-serverless-responsibility)

Moving from VPS to serverless, you hand over more: first the operating system and restarts, then the machines and scaling. You pay for that with less control and some limits, such as a time cap per run and no memory between requests.

## How to choose

| | VPS | PaaS | Serverless |
| --- | --- | --- | --- |
| Best when | You want control or a low fixed cost | You want to push code and stop thinking about machines | Traffic is spiky and the backend is small |
| You handle | OS patches, TLS, restarts, scaling | Choosing a plan; little else | Function size, time limits, cold starts |
| Watch out for | Nobody is on call but you | Cost grows with each service | State between requests; many small functions are hard to follow |

## Real projects mix them

A project with a **Render** setup might run an API (a web service), a background worker for slow jobs and a cron job for scheduled work, three processes on one platform. A project on **Vercel** might serve the frontend there and add a few API functions beside it. Neither is better; they fit different backends. Which shapes a backend can take, and how to pick, is in [Choosing the stack](/blog/choosing-the-stack).

Platform status changes, so check before you commit. For example, Heroku, once the default PaaS, moved into sustaining engineering mode in February 2026: it keeps running and gets fixes, but no new features, so new projects usually look elsewhere.

> [!PRINCIPLE] Core principle
> Server code needs a runtime. Moving from VPS to PaaS to serverless trades control for less to manage.
