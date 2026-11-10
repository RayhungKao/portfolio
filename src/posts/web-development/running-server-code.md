---
title: "Where server code runs: VPS, containers, PaaS and serverless"
date: 2026-10-18
summary: "Four ways to run code on every request, why you would pick a VPS or containers, and what you manage in each."
series: web-backend
order: 501
part: Running the backend
draft: false
---

**What you'll learn:** what a VPS, a container platform, a PaaS and serverless each are, when a VPS pays off and why you would use containers, who manages what in each, and how real projects mix them.

Static files need only a host. Code that runs on every request needs a **runtime**: a place that starts your program, keeps it healthy and gives it a network address. There are four common ways to get one, plus one packaging format that works with most of them.

## The options

| Option | What it is | Examples |
| --- | --- | --- |
| VPS | A rented virtual Linux machine. You install and run everything on it. | AWS EC2, Google Compute Engine, DigitalOcean Droplets, Hetzner Cloud, Akamai Cloud (formerly Linode) |
| Container | Your app and its dependencies packed in an image that runs the same anywhere. It is a packaging format, not a host: a container still has to run somewhere. | A Dockerfile, run on a VPS or on a platform |
| Container platform | A service that runs your container image and restarts or adds copies of it. You never log in to a machine. | Google Cloud Run, AWS ECS on Fargate, Azure Container Apps; Kubernetes services such as EKS, GKE and AKS for larger teams |
| PaaS | A platform that builds and runs your app from a Git push or an image, and handles restarts and HTTPS. | Render, Railway, Fly.io, AWS Elastic Beanstalk, Azure App Service |
| Serverless | Small functions that the platform starts per request and stops afterwards, billed per execution. | AWS Lambda, Vercel Functions, Cloudflare Workers, Google Cloud Run functions, Azure Functions |

## They are all in the cloud

All four are usually rented from a cloud provider. What differs is how much of the machine you see: with a VPS you get the whole operating system, with serverless you see only your function. The large providers offer every option:

| Provider | VPS | Container platform | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| AWS | EC2 | ECS on Fargate | Elastic Beanstalk | Lambda |
| Google Cloud | Compute Engine | Cloud Run | App Engine (Google recommends Cloud Run to new users) | Cloud Run functions |
| Azure | Virtual Machines | Container Apps | App Service | Functions |

A physical server of your own, in an office or a data centre you rent space in, is called **on-premises**. It is rare for a new web app, and it is mostly chosen when the machine must sit in a particular place or network.

A Dockerfile for a small Node API shows what "packing" means:

```dockerfile
FROM node:22-slim          # start from an image that already has Node
WORKDIR /app               # work inside /app
COPY package*.json ./      # copy the dependency list first, so the next step can be cached
RUN npm ci --omit=dev      # install dependencies once, at image build time
COPY . .                   # then copy the source
CMD ["node", "server.js"]  # what the container runs when it starts
```

## When a VPS pays off

A VPS is the option with the fewest rules: you get a Linux machine and decide everything else. Whether that is worth it depends on the traffic, the kind of work and who will look after the machine. It is never the best choice on every count.

### Cost depends on traffic

Take one small API: each request runs for 100 ms in 512 MB of memory. Here is what it costs per month on AWS Lambda (x86, US East, called through a function URL) and on a DigitalOcean Droplet, at list prices checked in November 2026:

| Average traffic | Requests a month | AWS Lambda | Droplet, 1 vCPU / 1 GiB |
| --- | --- | --- | --- |
| 0.1 a second | 0.26 million | $0 (inside the free tier) | $6 |
| 1 a second | 2.6 million | $0.32 | $6 |
| 5 a second | 13 million | $6.53 | $6 |
| 10 a second | 26 million | $19.92 | $6 |
| 50 a second | 130 million | $127 | $6 to $18, if one machine keeps up |

Lambda charges $0.20 per million requests and $0.0000166667 per GB-second, after a free tier of one million requests and 400,000 GB-seconds a month. A Droplet costs the same whatever the traffic: $6 a month for 1 vCPU and 1 GiB, with 1,000 GiB of outbound transfer included.

For this API the two cost the same at about **5 requests a second, averaged over the month**. Below that, serverless is cheaper, and nearly free for a side project. Above it, a fixed-price machine wins, and the gap grows with traffic. The table leaves out two things that can change the answer: data transfer, which Lambda bills at EC2 rates and a Droplet includes up to its allowance, and your own time, which the next sections cover.

### Scenarios

| Scenario | Traffic | Usually the better fit | Why |
| --- | --- | --- | --- |
| A side project or an internal tool | A few hundred requests a day | Serverless or a PaaS free tier | Well inside the free tier; a VPS costs money while it sits idle |
| An API with steady traffic all day | 10 requests a second, around the clock | VPS, or a container platform with one copy always on | About $20 a month on Lambda against $6 for a Droplet, and the gap grows |
| Chat or live dashboards over WebSockets | Thousands of connections held open for hours | VPS or a container platform | Serverless WebSockets close at a time limit (Vercel Functions: 300 to 800 seconds; AWS API Gateway: 2 hours), so connections held for hours fit a server better |
| A ticket sale or a product launch | 2,000 requests a second for 10 minutes, then almost nothing | Serverless or a container platform that scales out | A VPS must be sized for the peak and sits idle the rest of the day; Lambda's default limit of 1,000 concurrent executions covers the 200 this peak needs |
| A team with nobody to run servers | Any | PaaS or serverless | Patching, certificates and backups need an owner, and an unpatched VPS is the risk |

### Five dimensions

| | VPS | Serverless (AWS Lambda) |
| --- | --- | --- |
| Cost | Fixed per month; cheapest once traffic is steady | Per request and per GB-second; cheapest when traffic is low or spiky |
| Scaling | By hand. A bigger Droplet means powering it off first, about one minute of downtime per GB of used disk, and the disk cannot shrink back. More machines need a load balancer | Automatic, up to 1,000 concurrent executions per Region by default; each function can add 1,000 every 10 seconds |
| Maintenance | You patch the OS, renew certificates, take backups, restart crashed processes and watch the disk | AWS applies runtime security updates automatically by default; you maintain your code and its dependencies |
| Security | You own the guest OS, its patches and the firewall. AWS's shared responsibility model puts exactly these on the customer for EC2 | No OS or SSH for you to secure; your part is permissions, secrets and your code |
| Control | Total: any process, any port, any software, long-lived connections | Within the platform's limits: time per run, connections closed at that limit, no state between requests |

So a VPS pays off when traffic is steady enough to pass the break-even point, the work needs long-running processes or open connections, and someone will own the patching. If any of those is missing, a managed option is usually cheaper once you count your time.

## Why containers

A container fixes a different problem: "it works on my machine". The image carries the exact runtime, system libraries and dependencies, so the same thing runs on your laptop, in CI and in production.

- **Same image everywhere.** The build that passed the tests is the build that ships. A missing system library shows up when you build the image, not after a deploy.
- **Several services on one machine, kept apart.** The API, a worker and Redis can share one VPS, each in its own container with its own versions. [Docker](/blog/docker-basics) covers the commands.
- **Easy to move.** A VPS with Docker, a container platform and most PaaS accept the same image. Changing provider means pointing a new host at the image, not rewriting the setup.
- **Scaling is running more copies.** A container platform adds copies of the image when traffic grows and removes them when it drops. Google Cloud Run can even scale to zero when nobody is using the app.

Containers are not a host by themselves. You still choose where they run: on a VPS you manage, or on a container platform that manages the machines for you.

## Who manages what

![Who manages what on a VPS, a PaaS and serverless](diagram:vps-paas-serverless-responsibility)

Moving from VPS to serverless, you hand over more: first the operating system and restarts, then the machines and scaling. You pay for that with less control and some limits, such as a time cap per run and no memory between requests. A container platform sits close to a PaaS: you supply an image, or source code it builds into one, and the platform runs the machines. Most PaaS also accept images, so the line between the two is thin.

## How to choose

| | VPS | Container platform | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| Best when | You want control or a low fixed cost | You already have an image and want the platform to run and scale it | You want to push code and stop thinking about machines | Traffic is spiky and the backend is small |
| You handle | OS patches, TLS, restarts, scaling | The image, CPU and memory per copy, how many copies | Choosing a plan; little else | Function size, time limits, cold starts |
| Watch out for | Nobody is on call but you | More concepts to learn (services, tasks, revisions) | Cost grows with each service | State between requests; many small functions are hard to follow |
| Examples | A side project on a Hetzner VPS with Docker Compose: the app, PostgreSQL and Redis on one machine | An API image on Cloud Run that scales to zero at night | A Rails app on Render with a worker and a cron job | A Stripe webhook on AWS Lambda that runs a few times a day |

## Real projects mix them

A project with a **Render** setup might run an API (a web service), a background worker for slow jobs and a cron job for scheduled work, three processes on one platform. A project on **Vercel** might serve the frontend there and add a few API functions beside it. A larger company might run its main API on a container platform, its scheduled reports as serverless functions, and a legacy system on virtual machines. Neither is better; they fit different backends. Which shapes a backend can take, and how to pick, is in [Choosing the stack](/blog/choosing-the-stack).

Platform status changes, so check before you commit. For example, Heroku, once the default PaaS, moved into sustaining engineering mode in February 2026: it keeps running and gets fixes, but no new features, so new projects usually look elsewhere.

> [!PRINCIPLE] Core principle
> Server code needs a runtime. Moving from a VPS to a container platform, a PaaS and serverless trades control for less to manage, and a container image keeps you free to move between them.
