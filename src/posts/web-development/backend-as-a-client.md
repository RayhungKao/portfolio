---
title: "Your backend is also a client"
date: 2026-10-24
summary: "A backend answers requests and also sends them. How the layers around outgoing requests mirror middleware, what each language calls them, and why a check on outgoing requests must see every one, redirects included."
series: web-backend
order: 108
part: How a backend works
draft: false
---

**What you'll learn:** why every backend is a client as well as a server, what layers belong around the requests it sends, what those layers are called in five common stacks, and why a check that runs once per call can miss a redirect.

[Inside a backend](/blog/inside-a-backend) followed a request on its way in: routing, middleware, handler, service, data access. That is half the picture. The same backend also sends requests out. It queries a database, charges a card through a payment API, sends an email through a mail service, asks a model API for a reply. In each of those exchanges your backend is the **client**.

Here "client" means the side that sends a request, not the browser. Server and client are roles in one exchange, and a backend plays both at once.

![Layers around incoming and outgoing requests](diagram:server-and-client-layers)

## One backend, many roles

Take a shop backend that handles `POST /api/orders`.

| Connection | Who sends the request | Your backend's role |
| --- | --- | --- |
| Browser → `/api/orders` | The browser | Server |
| Backend → PostgreSQL | Your backend | Client |
| Backend → payment API | Your backend | Client |
| Backend → mail service | Your backend | Client |

Some programs are almost all client. Picture a crawler that reads a few Q&A sites every half hour, asks a model API to draft a reply to each new question, and emails the drafts. The only request it receives is the scheduler's ping that starts a run. Everything else it does is sending requests.

## Outgoing requests have layers too

Middleware exists so that rules about incoming requests live in one place, before any handler runs. Outgoing requests have rules of their own, and they belong in one place for the same reason.

| Concern | Incoming (middleware) | Outgoing (client layers) |
| --- | --- | --- |
| Who is allowed | Reject a caller who is not logged in (401) | Attach the API key; refuse a request the program must never send |
| Time | Cap how long a request may take | Give up on a remote site that does not answer |
| Failure | Turn an exception into a 500 | Retry a 503 with a pause; switch to a backup provider |
| Records | Log method, path and status | Log the call, with secrets removed from the URL |

The table has one asymmetry. Retrying belongs almost entirely to the client side. A server answers once; the side that sent the request decides whether to try again, which is why [idempotency](/blog/queues-and-workers) matters to whoever retries.

## The same pattern, different names

Both sides use the same shape: each layer wraps the next one and may stop early. The names differ.

| Stack | Incoming (server) | Outgoing (client) |
| --- | --- | --- |
| Node.js | Express `app.use(fn)` | axios interceptors, or a function that wraps `fetch` |
| Go | A function that wraps `http.Handler`, called middleware | A type that wraps `http.RoundTripper`, called a transport |
| Spring Boot | Servlet `Filter`, `HandlerInterceptor` | `ClientHttpRequestInterceptor` (RestClient), `ExchangeFilterFunction` (WebClient) |
| Django / Python | The `MIDDLEWARE` setting | A transport or event hooks in httpx, an adapter in requests |
| ASP.NET Core | `app.Use(...)` | A `DelegatingHandler` for `HttpClient` |

So "middleware" is the common word for the incoming side. For the outgoing side there is no single word; "interceptor" is the most common, and Go people say "transport".

## An example: a client that can only read

Suppose the crawler logs in with an account that can also post answers. The program must only read, so every write except the login is refused before it leaves the machine. In Node, that rule lives in one function that every outgoing request goes through:

```ts
async function readOnlyFetch(url: string, init: RequestInit = {}, hops = 0): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const target = new URL(url)
  const isLogin = method === 'POST' && target.pathname === '/login'
  if (method !== 'GET' && !isLogin) throw new Error(`refused: ${method} ${url}: this account is read-only`)

  // Follow redirects here, not inside fetch, so every hop passes the check above.
  const res = await fetch(url, { ...init, redirect: 'manual' })
  const location = res.headers.get('location')
  if (res.status >= 300 && res.status < 400 && location) {
    const next = new URL(location, url)
    if (next.origin !== target.origin) throw new Error(`refused: redirect to ${next.origin}`)
    if (hops >= 5) throw new Error('refused: too many redirects')
    return readOnlyFetch(next.href, { headers: init.headers }, hops + 1)
  }
  return res
}
```

The example follows only redirects within the same site, and always as a `GET`, which is enough for a program that only reads.

## Why the check follows redirects itself

One call to `fetch` can send more than one request. By default `fetch` follows redirects on its own (`redirect: 'follow'`), and a function wrapped around it runs once, before the first request:

```text
fetch("https://site.example/profile")
  ├─ request 1: GET https://site.example/profile  → 302, Location: https://evil.example/steal
  └─ request 2: GET https://evil.example/steal    ← fetch follows it on its own
```

A check that runs once per call sees only the URL you passed in. Run against a local test server on Node 22, a wrapper around `fetch` ran once while the request went on to a second host. With `redirect: 'manual'`, Node's `fetch` returns the 302 itself and lets your code decide, so the next hop goes through the same check as the first. A browser's `fetch` returns a filtered response for `manual` instead, without the `Location`, so this pattern belongs on the server.

Placed this way, the check has two properties that checks scattered across call sites lack:

- **Redirects are checked.** A redirect to another site is refused before any request reaches that site, so the session cookie never travels there.
- **No caller can forget.** As long as the program sends requests only through `readOnlyFetch`, code added next year passes through the same check.

Retries follow the same rule: each attempt is a new request, so a retry belongs where the check still runs before every attempt.

Some HTTP clients build this in. Go's `http.Client` calls its transport, an `http.RoundTripper`, once for every request, redirects included, so a guard placed in a transport sees every hop without following redirects by hand.

## One layer, one question

Whatever the stack, the layers around outgoing requests stack like middleware, and each answers one question about one request:

| Layer | Its question |
| --- | --- |
| Guard | May this request be sent at all? |
| Retry | This attempt failed; send it again? |
| Proxy | Should this request go through the proxy's address? |
| The HTTP library | Send it. |

If one layer handled a whole chain of requests, for example by following redirects inside it, the layers outside it would never see the requests in the middle, and the guard could not stop them. Server middleware follows the same rule in the other direction: an Express middleware `(req, res, next)` handles one incoming request, which is why middlewares chain.

Order matters. The guard goes outside the proxy layer, because a proxy layer rewrites the URL to the proxy vendor's address, and after that the guard could no longer tell which site the request was for.

> [!PRINCIPLE] Core principle
> Server and client are roles in one exchange, and a backend plays both. Put the rules for incoming requests in middleware, and the rules for outgoing requests in the one place every outgoing request passes through, redirects included.
