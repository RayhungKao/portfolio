---
title: "The edge layer: CDN and reverse proxy"
date: 2026-10-18
summary: What Cloudflare, CloudFront, Nginx and Caddy each do, and how they stack in front of your app.
series: web-backend
order: 102
part: How a backend works
draft: false
---

**What you'll learn:** what a CDN and a reverse proxy are, how Cloudflare, CloudFront, Nginx and Caddy fit together, and why a proxy on your own machine cannot stop a flood of traffic.

Between the browser and your app sits a layer you rarely write code for: the edge. It serves files from a place close to the user, ends the TLS connection, and decides which requests are allowed to reach your server at all. Two names cover most of it: a CDN and a reverse proxy.

## One path, two stops

A **reverse proxy** accepts requests on behalf of your app and forwards them. A **CDN** (content delivery network) is a reverse proxy that runs in many cities at once, so each user talks to a nearby copy. A CDN is one thing a reverse proxy does, not a separate species.

![A request through Cloudflare and Nginx to the app](diagram:edge-layer-request-path)

In this setup the first stop is Cloudflare, which lives on the internet edge. It answers cached files on its own and absorbs attack traffic before it gets near you. The second stop is Nginx, running on your own VPS. It terminates TLS, sends `/api` to the backend and everything else to the frontend, and compresses responses. Your app only sees the requests that survived both.

## Four products, two jobs

| Product | Where it runs | Typical use | Example |
| --- | --- | --- | --- |
| Cloudflare | Cloudflare's network, between users and you | CDN, DNS, DDoS protection, firewall rules | A blog served from a VPS, with Cloudflare caching images and blocking bots. |
| CloudFront | Amazon's network, part of AWS | CDN for an AWS-hosted site | Product photos in an S3 bucket, delivered through CloudFront. |
| Nginx | Your own machine | Reverse proxy, TLS, routing, static files | `/api` goes to a Node service on port 4000, everything else to Next.js on port 3000. |
| Caddy | Your own machine | The same job as Nginx, with automatic HTTPS | A side project where you want a working HTTPS certificate without touching certbot. |

Read the table in pairs. Nginx and Caddy are alternatives: you pick one for the machine. Cloudflare and CloudFront are alternatives too: you pick one CDN. A CDN and a reverse proxy are not alternatives, because they live in different places and are normally stacked.

Cloudflare is the usual first choice for small projects. As of October 2026, W3Techs reports it on about 28% of all websites, which is about 86% of the sites with a known reverse proxy. About 68% of the sites it monitors use none.

## Why Nginx alone cannot stop a flood

It is tempting to put rate limiting in Nginx and call it done. That works against one noisy client and fails against a flood, because by the time Nginx sees a request, the cost of receiving it has already been paid.

![Limits along the request path](diagram:request-path-resource-limits)

The network link has a fixed bandwidth, and a full pipe drops legitimate packets too. The kernel keeps a limited table of connections, and a flood of half-open ones fills it. Every TLS handshake costs CPU, even for requests that Nginx will reject a moment later. Nginx and your code can act only after all three. A CDN works because it is a much larger pipe in front of yours, and attackers are stopped where they arrive.

## Three details that bite

**The real client IP.** Behind Cloudflare, every connection to Nginx comes from a Cloudflare address, so logs and rate limits all see the same few IPs. Cloudflare passes the real address in the `CF-Connecting-IP` header. Tell Nginx to trust that header only from Cloudflare's published ranges:

```nginx
# one set_real_ip_from line per Cloudflare range
set_real_ip_from 173.245.48.0/20;
real_ip_header CF-Connecting-IP;
limit_req_status 429;   # the default rejection is 503
```

**The SSL mode.** Cloudflare can encrypt only the browser leg and talk to your server in plain HTTP, which leaves the second leg readable. Use *Full (strict)*: Cloudflare encrypts to your server and checks that its certificate is valid.

**The firewall.** Cloudflare only helps if attackers cannot walk around it. If your server's IP address leaks, they send traffic straight to it. Configure the VPS firewall to accept ports 80 and 443 only from Cloudflare's IP ranges.

> [!PRINCIPLE] Core principle
> A CDN is one thing a reverse proxy does. Cloudflare sits at the internet edge and absorbs traffic; Nginx sits on your own machine and routes it.
