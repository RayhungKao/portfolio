---
title: "The edge layer in practice: Nginx, Caddy and four real setups"
date: 2026-10-18
summary: "A full Nginx config behind Cloudflare, the Caddy equivalent, and four setups from a static site to a managed platform."
series: web-development
order: 901
part: Backend in code
draft: true
---

**What you'll learn:** a working Nginx configuration behind Cloudflare, the same job in Caddy, and four real setups to compare.

[The edge layer](/blog/edge-layer) explains what a CDN and a reverse proxy do. This article is the configuration and the setups.

## What each layer does in the common setup

![A request through Cloudflare and Nginx to two apps](diagram:cloudflare-nginx-layered)

![What the Cloudflare edge does before the origin](diagram:cloudflare-reverse-proxy-path)

Cloudflare terminates TLS for the browser, filters attacks and answers cached files. Nginx on your own server routes `/` to Next.js and `/api` to an Express API.

## A full Nginx config

```nginx
# /etc/nginx/conf.d/app.conf

# Cloudflare connects to us, so restore the visitor's real address.
# The ranges are published at https://www.cloudflare.com/ips and change,
# so generate these lines from that list instead of copying them once.
set_real_ip_from 198.51.100.0/24;   # example only: put every Cloudflare range here
real_ip_header   CF-Connecting-IP;

# Allow 10 requests per second per visitor, with a short burst.
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_status 429;

server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate     /etc/ssl/example.com.pem;       # a Cloudflare Origin certificate
    ssl_certificate_key /etc/ssl/example.com.key;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:4000;               # the Express API
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;  # the restored visitor address
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;               # Next.js
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Three things to notice. `set_real_ip_from` plus `real_ip_header` make `$remote_addr`, and therefore the rate limit and the logs, use the visitor's address instead of a Cloudflare address. `limit_req_status 429` makes a limited visitor see "too many requests" rather than the default 503. And the origin certificate lets Cloudflare talk to Nginx over HTTPS, which is the "Full (strict)" SSL mode, not the weaker "Flexible".

## The same job in Caddy

```text
# Caddyfile
{
    servers {
        trusted_proxies static 198.51.100.0/24   # example only: every Cloudflare range
        client_ip_headers CF-Connecting-IP
    }
}

example.com {
    encode zstd gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:4000
    }

    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

Caddy obtains and renews the certificate for `example.com` on its own, which removes the certificate lines from the Nginx version. The `servers` block plays the role of `set_real_ip_from` and `real_ip_header`. If you do not use Cloudflare, delete it. Caddy has no built-in rate limiter, so a per-visitor limit needs a plugin or a limit at another layer.

## Four real setups

| Setup | What sits in front | Who runs what | Fits |
| --- | --- | --- | --- |
| Static site on a CDN | An S3 bucket and CloudFront, or a static host | Nothing of yours is running | A portfolio or documentation site |
| One VPS with Caddy | Caddy on the same machine as the app | You run the machine and the app | A side project that wants HTTPS with no effort |
| VPS with Nginx behind Cloudflare | Cloudflare, then Nginx, then the apps | Cloudflare runs the edge; you run Nginx and the apps | A site with an API that needs attack filtering and caching |
| Managed platform | The platform's own edge, with no Nginx of yours | The platform | A Next.js app on Vercel or Netlify |

The managed platform row shows the other side of the same idea. You do not configure an edge, because the platform's edge is built in; you give up control of the details, such as custom rate-limit rules, in exchange.

> [!PRINCIPLE] Core principle
> The edge is a stack of layers, and each one needs to know the real visitor address, speak HTTPS to the next layer, and refuse traffic that skipped the layer in front of it.
