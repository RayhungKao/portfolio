---
title: When you need a backend
date: 2026-10-18
summary: Five conditions that decide whether a site needs a backend, and the six parts a complete web service is made of.
series: web-development
order: 601
part: Backend
draft: true
---

**What you'll learn:** how to tell whether a site needs a backend, and which components a complete web service is made of.

Many sites need no backend at all. A portfolio, a blog or a documentation site is a folder of files, and a CDN can serve a folder of files. The picture changes the moment a visitor can log in, pay, comment or upload. Five conditions tell you when that moment has come. If any one of them is true, you need a backend.

## Five conditions

| Condition | What it means | Example |
| --- | --- | --- |
| Secrets | The code needs a key that must never reach a browser. | Charging a card with Stripe. The secret key can issue refunds and read customer data, so only your server may hold it. |
| Shared, persistent state | Data that outlives one tab and is visible to more than one person. | Comments and likes on a post. `localStorage` belongs to one browser on one device, so a like saved there is invisible to everyone else and lost when the user switches phones. |
| Trusted decisions | A rule that has to hold even when the user is hostile. | Price, stock and permissions. The server recomputes the cart total, and the number in the browser is only a display. Anyone can edit the JavaScript running in their own browser. |
| Work independent of the browser | Something that must happen whether or not the tab stays open. | A confirmation email after checkout, a nightly sales report, transcoding an uploaded video. |
| Systems the browser cannot reach | Resources that are not exposed to the internet, or do not speak HTTP. | A PostgreSQL database speaks its own protocol behind a firewall. An internal ERP answers only to the company network. |

If none of the five is true, you do not need a backend. A portfolio like this one, a Next.js project exported as static files and hosted on GitHub Pages, needs none of them. The pages are built once and served as files. GitHub Pages only serves files that already exist, so a route handler in the project could never answer a request there.

Ask the five questions feature by feature, not site by site. A store's product pages can be plain files while its checkout needs a backend, and that one backend then serves every feature that needs it.

## Needing a backend is not the same as running a server

The five conditions describe capabilities, not machines. A hosted service can provide them. Supabase or Firebase give you a shared database, a login system and rules that are enforced on their side. Serverless functions keep your secrets and run your code without a machine for you to look after.

Whether to run your own server, rent a platform or use a backend-as-a-service is a separate decision, and the series comes back to it when we choose a stack. For now the question is only which capability you need.

## What a complete web service looks like

Take the five conditions, put them into an online store, and you end up with six boxes.

![Anatomy of a web service](diagram:web-service-architecture)

The colours mean the same thing in every diagram of this series. Purple is code you write, teal is data you keep, and gray is anything outside your own code.

| Box | Its job | In an online store |
| --- | --- | --- |
| Client | Runs the code you ship but do not control. | A browser on a laptop, the iOS app. |
| Edge | Sits in front of your servers. It serves cached files, terminates TLS and filters attacks. | Cloudflare caches product images and blocks abusive traffic. A server-rendered product listing that looks the same for everyone can be cached there too. A cart, which is personal, cannot. |
| Backend | Your code. It holds the secrets and enforces the rules. | A Node service with Next.js route handlers that check the login, price the cart and charge Stripe. |
| Data stores | Everything you keep. | PostgreSQL for orders and users, Redis for sessions, S3 for product photos. |
| Queue and worker | Does work after the request has already returned. | A queue such as BullMQ or SQS holds a "send confirmation email" job, and a worker process picks it up. |
| Third-party services | Systems you call but do not run. | Stripe for payments, SendGrid for email. |

The queue and the worker get a full article of their own later in the series. For now it is enough to know where they sit.

## Follow one request

Here is what happens when a customer presses "Place order". Most steps are one of the five conditions at work.

1. The browser sends `POST /api/orders` with the cart.
2. The edge passes it through, because it does not cache a POST.
3. The backend checks who is logged in, reads the real prices from PostgreSQL and recomputes the total. That is a trusted decision.
4. It calls Stripe with the secret key. That is a secret that never leaves the server.
5. It writes the order to PostgreSQL and puts a "send confirmation" job on the queue. That is shared state, kept where every device can read it.
6. It returns `201 Created`, and the browser shows "Thank you".
7. A moment later the worker takes the job and asks SendGrid to send the email. That is work independent of the browser: the customer may have closed the tab by now.

Take the backend away and the steps that matter have nowhere to run. The price could be edited, the Stripe key would sit in the page source, the order would live in one browser only, and the email would never be sent.

> [!PRINCIPLE] Core principle
> A backend exists for one reason: some things the browser cannot do, or cannot be trusted to do.
