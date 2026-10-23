---
title: "Where a web page comes from: browser, server and HTTP"
date: 2026-10-18
summary: "The path of one request from typing a URL to seeing a page: browser, server, HTTP, and why HTTPS matters."
series: web-frontend
order: 101
part: The map
draft: false
---

**What you'll learn:** the path one request takes from a URL to the screen, what the three languages of a page each do, and why development and production behave differently.

Every later article in this series assumes you can picture one thing: what happens between typing a URL and seeing a page. It is shorter than it sounds.

## A page is a chain of requests

A page is not one file. The browser asks for a page, gets HTML back, reads it, and discovers it needs more files. So it asks again.

![One page view as a chain of requests between browser and server](diagram:page-request-chain)

Three roles appear in that picture:

- **Browser (the client).** The program on the user's device that asks for things and draws the result. Example: Chrome on a phone.
- **Server.** A computer that answers requests. Example: the machine behind `example.com` that returns the blog page.
- **HTTP.** The agreed format of the questions and answers. Example: `GET /blog` is a question, and a response with status `200` and some HTML is the answer.

## What the browser receives

| Language | Job | Example |
| --- | --- | --- |
| HTML | Content and structure | Headings, paragraphs, links, a list of posts. |
| CSS | Look | Colours, layout, fonts, a dark theme. |
| JavaScript | Behaviour and data | Handling a click, validating a form, loading more posts. |

## The path of one request

1. **DNS lookup.** The browser turns `example.com` into an IP address, like looking up a phone number.
2. **Connection.** It opens a connection to that address (with TLS, if the URL starts with `https`).
3. **Request.** It sends `GET /blog`.
4. **HTML.** The server answers with the page's HTML.
5. **Further requests.** The HTML mentions stylesheets, scripts and images, so the browser requests each of them.
6. **Render.** The browser combines everything and draws the page.

The HTML is usually only the beginning. Many of the later articles are about what the first response contains and who produced it.

## HTTP and HTTPS

HTTPS is HTTP wrapped in TLS. TLS gives three things: **encryption** (nobody on the café Wi-Fi can read the traffic), **identity** (you are talking to the real `example.com`) and **integrity** (the content was not altered on the way). Browsers label plain HTTP pages "not secure".

It is not only about the padlock. A secure context is a page the browser trusts enough to unlock powerful features: one served over HTTPS, or from `localhost`. Those secure-context features include Service Workers, geolocation, camera and microphone.

So on `http://localhost:3000` the camera and Service Workers work without HTTPS. The same page opened as `http://192.168.1.10:3000` from your phone does not count as `localhost`, and the browser blocks both.

## Four environments, two behaviours

The same app runs in several places, and they do not all use HTTPS. Plain HTTP on `localhost` is the easiest default for development, not a best practice. Switch to local HTTPS when one of these applies:

- You test from a phone or another device on your network, for example `http://192.168.1.10:3000`.
- You test `Secure` cookies or OAuth callbacks.
- You use a custom local domain such as `http://app.local:3000` instead of `localhost`.

| Environment | Protocol | Notes |
| --- | --- | --- |
| Development | HTTP on `localhost` by default | Use a tool such as mkcert for local HTTPS in the cases above. |
| Test | HTTP, usually in CI | End-to-end tests (for example Playwright or Cypress) open a real browser but connect to `localhost`, so plain HTTP is fine. |
| Staging | HTTPS | Set up the same way as production, so surprises show up here. |
| Production | HTTPS only | Redirect HTTP to HTTPS and send an HSTS header so browsers stop trying HTTP. |

The gaps between development and production cause a predictable set of bugs:

- A cookie marked `Secure` is not sent over plain HTTP. Chrome and Firefox make an exception for `localhost`, but Safari does not, so a login that works in Chrome can silently fail in Safari during development.
- A cookie with `SameSite=None` must also be `Secure`, so it disappears on plain HTTP. See [Authentication: session vs JWT](/blog/authentication-session-vs-jwt) for cookie attributes.
- The OAuth redirect URL registered with the provider says `https://example.com/callback`, not `http://localhost:3000/callback`.
- CORS allows one origin, but the page is served from another.
- Mixed content: an HTTPS page that loads an `http://` image is blocked.

Staging and environment variables catch most of these; [Deployment and environment setup](/blog/deployment-and-env-setup) covers them. Most static hosts issue certificates for you automatically.

## Frontend and backend

"Frontend" is code that runs in the browser. "Backend" is code that runs on a server. JavaScript can live on both sides, which is why the word alone does not tell you where code runs. The next article takes that apart.

> [!PRINCIPLE] Core principle
> A page is a series of requests and responses, and the HTML is only the first response.
