---
title: "Where server code runs: VPS, containers, PaaS and serverless"
date: 2026-10-18
summary: "The ways to run code on every request, a two-step decision tree that picks the type and then the vendor, and what you manage in each."
series: web-backend
order: 501
part: Running the backend
draft: false
---

**What you'll learn:** what a VPS, a container platform, a PaaS and serverless each are, how to choose with two steps (first the type, then the vendor), who manages what in each, and how real projects mix them.

Static files need only a host. Code that runs on every request needs a **runtime**: a place that starts your program, keeps it healthy and gives it a network address. There are four common ways to get one, plus one packaging format that works with most of them.

## The options

| Option | What it is | Examples |
| --- | --- | --- |
| VPS | A rented virtual Linux machine. You install and run everything on it. | EC2 (AWS), Compute Engine (Google), DigitalOcean Droplets, Hetzner Cloud, Akamai Cloud (formerly Linode) |
| Container | Your app and its dependencies packed in an image that runs the same anywhere. It is a packaging format, not a host: a container still has to run somewhere. | A Dockerfile, run on a VPS or on a platform |
| Container platform | A service that runs your container image and restarts or adds copies of it. You never log in to a machine. | Cloud Run (Google), ECS on Fargate (AWS), Container Apps (Azure); Kubernetes services such as EKS (AWS), GKE (Google) and AKS (Azure) for larger teams |
| PaaS | A platform that builds and runs your app from a Git push or an image, and handles restarts and HTTPS. | Render, Railway, Fly.io, Elastic Beanstalk (AWS), App Service (Azure) |
| Serverless | Small functions that the platform starts per request and stops afterwards, billed per execution. | Lambda (AWS), Cloud Run functions (Google), Functions (Azure), Vercel Functions, Cloudflare Workers |

## They are all in the cloud

All four are usually rented from a cloud provider. What differs is how much of the machine you see: with a VPS you get the whole operating system, with serverless you see only your function. The large providers offer every option:

| Provider | VPS | Container platform | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| AWS | EC2 | ECS on Fargate | Elastic Beanstalk | Lambda |
| Google Cloud | Compute Engine | Cloud Run | App Engine (Google recommends Cloud Run to new users) | Cloud Run functions |
| Azure | Virtual Machines | Container Apps | App Service | Functions |

A physical server of your own, in an office or a data centre you rent space in, is called **on-premises**. It is rare for a new web app, and it is mostly chosen when the machine must sit in a particular place or network.

## Pick the type, then the vendor

Two separate questions hide in "where should this run?". The first is the **type**: how much you hand over, from a whole machine down to a single function. The second is the **vendor**: one of the three big clouds, or an independent company. The big clouds offer every type, so the two answers do not depend on each other.

![Where to run a backend: pick the type, then the vendor](diagram:hosting-decision-tree)

### Step 1: the type

**Mostly data, login and permissions?** Then a backend-as-a-service (BaaS) may be all you need, and you write little backend code of your own. When some custom logic is needed, BaaS platforms run it for you: Supabase has Edge Functions, Firebase (Google) has Cloud Functions. [Choosing the stack](/blog/choosing-the-stack) covers when this is enough, and [BaaS platforms](/blog/baas-platforms) compares the products.

**Short jobs, and low or spiky traffic?** Then functions (FaaS). Each run has a time limit: 15 minutes on Lambda (AWS), 300 seconds on Vercel's Hobby plan and up to 800 on Pro. Two real cases mark the edges:

- **A spike you did not plan for.** When the art app Cara grew from 40,000 to 650,000 users in a week, its Vercel functions reached 56 million invocations a day and a bill of $98,280 ([InfoQ](https://www.infoq.com/news/2024/06/vercel-serverless-scale-expenses)). Vercel said it had warned the customer and no spending limit was set. Pay-per-use grows with traffic, so set a budget.
- **Steady, heavy work.** Prime Video's team rebuilt a stream-monitoring service, first made of Step Functions and Lambda, as a monolith and reported infrastructure costs more than 90% lower ([The New Stack](https://thenewstack.io/return-of-the-monolith-amazon-dumps-microservices-for-video-monitoring/)). The figure is the team's own, and others argue it was a redesign rather than a move away from serverless ([Network World](https://www.networkworld.com/article/3697737/6-lessons-from-the-amazon-prime-video-serverless-vs-monolith-flap.html)).

**Want to run the operating system yourself?** That fits steady traffic, a fixed monthly bill and someone who will do the patching. [When a VPS pays off](/blog/when-a-vps-pays-off) works through the cost, the scenarios and what you take on.

**None of these?** Then a **managed runtime**: a PaaS or a container platform. The two now overlap more than their names suggest. Render builds straight from a Git repository for Node.js, Python, Go and other languages, and also accepts a prebuilt image; on its Pro plan it scales on CPU and memory. Cloud Run (Google) takes an image, or builds one from your source code, and adds or removes copies with requests, CPU and concurrency, down to zero when idle. Pick between them by the vendor in step 2 more than by the label.

### Step 2: the vendor

Any type from step 1 can come from a big cloud or from an independent company. Three needs point to a big cloud:

- **Data, or users, in Taiwan.** Render's regions are Oregon, Ohio, Virginia, Frankfurt and Singapore; Railway's are California, Virginia, Amsterdam and Singapore; Fly.io's Asian regions are Tokyo and Singapore. Google Cloud has a Taiwan region (asia-east1) where Cloud Run runs, AWS opened a Taipei region in June 2025 that each account must enable first, and Azure's Taiwan North region is in preview. Distance shows up in every request: measured from a network in Taipei in November 2026, opening a connection to AWS took about 20 ms in Taipei, 50 ms in Tokyo, 70 ms in Singapore and 205 ms in US East. A CDN such as Cloudflare does not remove this gap for an API: by default it caches files such as images, CSS and JavaScript but not HTML or JSON, so dynamic requests still travel to wherever the server is ([The edge layer](/blog/edge-layer)).
- **Credits.** Start-up programmes give credits that make the first months nearly free. AWS Activate gives up to $5,000 to self-funded start-ups and up to $200,000 to those referred by an accelerator or investor.
- **Your own private network.** A VPC (virtual private cloud) is an isolated network you define inside a cloud: you choose the address ranges, the subnets and what can reach the internet, so a database can have no public address at all. When the rest of a system already lives in one, the code usually has to join it. The line is not absolute: on its Pro plan Render can reach resources in your AWS VPC through AWS PrivateLink.

A big cloud asks for one thing in return: someone who can set up its networking and permissions (IAM). Without that person, an independent vendor is usually the simpler path. Compliance alone does not decide it: Render lists SOC 2 Type 2, ISO 27001 and HIPAA, and Railway has SOC 2 Type II and signs HIPAA agreements.

## Why containers

A container fixes a different problem: "it works on my machine". The image carries the exact runtime, system libraries and dependencies, so the same thing runs on your laptop, in CI and in production.

- **Same image everywhere.** The build that passed the tests is the build that ships. A missing system library shows up when you build the image, not after a deploy.
- **Several services on one machine, kept apart.** The API, a worker and Redis can share one VPS, each in its own container with its own versions.
- **Easy to move.** A VPS with Docker, a container platform and most PaaS accept the same image. Changing provider means pointing a new host at the image, not rewriting the setup.

Containers are not a host by themselves: you still choose where they run. [Docker](/blog/docker-basics) covers the commands, and how Docker, Compose and Kubernetes fit together.

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

Moving from VPS to serverless, you hand over more: first the operating system and restarts, then the machines and scaling. You pay for that with less control and some limits, such as a time cap per run and no memory between requests. A container platform sits close to a PaaS: you supply an image, or source code it builds into one, and the platform runs the machines.

| | VPS | Container platform | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| You handle | OS patches, TLS, restarts, scaling | The image, CPU and memory per copy, how many copies | Choosing a plan; little else | Function size, time limits, cold starts |
| Watch out for | Nobody is on call but you | More concepts to learn (services, tasks, revisions) | Cost grows with each service | State between requests; many small functions are hard to follow |
| Example | A side project on a Hetzner VPS with Docker Compose: the app, PostgreSQL and Redis on one machine | An API image on Cloud Run (Google) that scales to zero at night | A Rails app on Render with a worker and a cron job | A Stripe webhook on Lambda (AWS) that runs a few times a day |

## Real projects mix them

A project with a **Render** setup might run an API (a web service), a background worker for slow jobs and a cron job for scheduled work, three processes on one platform. A project on **Vercel** might serve the frontend there and add a few API functions beside it. A larger company might run its main API on a container platform, its scheduled reports as serverless functions, and a legacy system on virtual machines. Neither is better; they fit different backends.

Platform status changes, so check before you commit. For example, Heroku, once the default PaaS, moved into sustaining engineering mode in February 2026: it keeps running and gets fixes, but no new features, so new projects usually look elsewhere.

> [!PRINCIPLE] Core principle
> Choose the type by the work, then the vendor by where the data must live, the credits you have and the network you must join. Server code needs a runtime, and a container image keeps you free to move between them.
