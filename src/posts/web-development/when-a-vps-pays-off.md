---
title: "When a VPS pays off: cost, scenarios and what you take on"
date: 2026-11-10
summary: "A VPS wins on cost once traffic is steady and loses on scaling and upkeep. List prices, five scenarios, five dimensions, and the company that went further and left the cloud."
series: web-backend
order: 502
part: Running the backend
draft: false
---

**What you'll learn:** when running your own VPS costs less than serverless, which kinds of work suit it, what you take on in scaling, upkeep and security, and what leaving the cloud looked like for one company.

[Where server code runs](/blog/running-server-code) ends its decision tree with a question: do you want to run the operating system yourself? This article answers it. A VPS is the option with the fewest rules: you get a Linux machine and decide everything else. Whether that is worth it depends on the traffic, the kind of work and who will look after the machine. It is never the best choice on every count.

## Cost depends on traffic

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

## Scenarios

| Scenario | Traffic | Usually the better fit | Why |
| --- | --- | --- | --- |
| A side project or an internal tool | A few hundred requests a day | Serverless or a PaaS free tier | Well inside the free tier; a VPS costs money while it sits idle |
| An API with steady traffic all day | 10 requests a second, around the clock | VPS, or a container platform with one copy always on | About $20 a month on Lambda against $6 for a Droplet, and the gap grows |
| Chat or live dashboards over WebSockets | Thousands of connections held open for hours | VPS or a container platform | Serverless WebSockets close at a time limit (Vercel Functions: 300 to 800 seconds; AWS API Gateway: 2 hours), so connections held for hours fit a server better |
| A ticket sale or a product launch | 2,000 requests a second for 10 minutes, then almost nothing | Serverless or a container platform that scales out | A VPS must be sized for the peak and sits idle the rest of the day; Lambda's default limit of 1,000 concurrent executions covers the 200 this peak needs |
| A team with nobody to run servers | Any | PaaS or serverless | Patching, certificates and backups need an owner, and an unpatched VPS is the risk |

## Five dimensions

| | VPS | Serverless (AWS Lambda) |
| --- | --- | --- |
| Cost | Fixed per month; cheapest once traffic is steady | Per request and per GB-second; cheapest when traffic is low or spiky |
| Scaling | By hand. A bigger Droplet means powering it off first, about one minute of downtime per GB of used disk, and the disk cannot shrink back. More machines need a load balancer | Automatic, up to 1,000 concurrent executions per Region by default; each function can add 1,000 every 10 seconds |
| Maintenance | You patch the OS, renew certificates, take backups, restart crashed processes and watch the disk | AWS applies runtime security updates automatically by default; you maintain your code and its dependencies |
| Security | You own the guest OS, its patches and the firewall. AWS's shared responsibility model puts exactly these on the customer for EC2 | No OS or SSH for you to secure; your part is permissions, secrets and your code |
| Control | Total: any process, any port, any software, long-lived connections | Within the platform's limits: time per run, connections closed at that limit, no state between requests |

So a VPS pays off when traffic is steady enough to pass the break-even point, the work needs long-running processes or open connections, and someone will own the patching. If any of those is missing, a managed option is usually cheaper once you count your time.

## At the far end: leaving the cloud

Some companies go a step beyond a VPS and run their own hardware. 37signals, the company behind Basecamp and HEY, announced in October 2022 that it would move both products off AWS and Google Cloud, citing the size of its cloud bill. It now runs them on servers it owns, in rented data centre space. The company projected savings of more than $10 million over five years, and in 2025 it said it would delete its AWS account and its S3 bill of about $1.5 million a year ([The Register](https://www.theregister.com/2025/05/09/37signals_cloud_repatriation_storage_savings), [DCD](https://www.datacenterdynamics.com/en/news/37signals-claims-it-saved-almost-2m-last-year-from-cloud-repatriation)). These are the company's own figures.

The reasoning is the same as the table above at a larger scale: steady, predictable load on a fixed-price machine beats paying per use, provided a team owns the machines.

> [!PRINCIPLE] Core principle
> A VPS trades upkeep for a fixed bill. It pays off when traffic is steady, the work needs a process that stays up, and someone owns the patching.
