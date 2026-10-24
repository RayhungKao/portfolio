---
title: "Your backend is also a client"
date: 2026-10-24
summary: "A backend answers requests and also sends them. How the layers around outgoing requests mirror middleware, what each language calls them, and why programs that mostly call other services are often written in Go."
series: web-backend
order: 108
part: How a backend works
draft: true
---

**What you'll learn:** why every backend is a client as well as a server, what layers belong around the requests it sends, what those layers are called in Node, Go, Java, Python and .NET, and when a program that mostly calls other services is a good fit for Go.

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

Some programs are almost all client. A crawler I run reads three legal Q&A sites every half hour, asks a model API to draft a reply to each new question, and emails the drafts. The only request it receives is the scheduler's ping that starts a run. Everything else it does is sending requests.

## Outgoing requests have layers too

Middleware exists so that rules about incoming requests live in one place, before any handler runs. Outgoing requests have rules of their own, and they belong in one place for the same reason.

| Concern | Incoming (middleware) | Outgoing (client layers) |
| --- | --- | --- |
| Who is allowed | Reject a caller who is not logged in (401) | Attach the API key; refuse a request the program must never send |
| Time | Cap how long a handler may run | Give up on a remote site that does not answer |
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

## A Go example: a client that can only read

The crawler logs in to sites with an account that can publish answers under someone else's name. The program must only read, so every write except the login is refused before it leaves the machine. In Go that rule is a transport:

```go
var ErrReadOnly = errors.New("refused: this account is read-only")

// readOnly sits between http.Client and the network.
type readOnly struct {
	next http.RoundTripper
}

func (t readOnly) RoundTrip(req *http.Request) (*http.Response, error) {
	isLogin := req.Method == http.MethodPost && req.URL.Path == "/login"
	if req.Method != http.MethodGet && !isLogin {
		return nil, fmt.Errorf("%s %s: %w", req.Method, req.URL, ErrReadOnly)
	}
	return t.next.RoundTrip(req)
}

client := &http.Client{Transport: readOnly{next: http.DefaultTransport}}
```

`http.Client` never touches the network itself. For every request it calls `Transport.RoundTrip` once, and for every redirect it follows it calls it again. That gives the transport two properties a check at each call site lacks:

- **Redirects are checked.** If a site answers with a redirect to another host, the next hop goes through `RoundTrip` too and can be refused before the session cookie travels with it.
- **No caller can forget.** Code added next year that uses the same client passes through the same check.

## Why a transport sees one request at a time

The guarantee a transport gives is this: every request goes through it, each one separately. No request skips it, and that is why a guard there is safe.

The contract behind the guarantee is small. Each call to `RoundTrip` handles one request: one request comes in, and one response or one error goes out. That is not a queue. Many goroutines can call the same transport at once, and Go requires every transport to be safe for that; `http.Transport` keeps a pool of connections so parallel requests do not wait for each other. Requests run in order only when one depends on another, such as a redirect, which needs the previous response's `Location`.

The contract matters because one call in your code can become several requests on the wire.

```text
client.Get("https://site.example/profile")
  ├─ request 1: GET https://site.example/profile  → 302, Location: https://evil.example/steal
  └─ request 2: GET https://evil.example/steal    ← the client decides to follow
```

A check that runs once per `client.Get` sees only the URL you passed in. A check inside `RoundTrip` sees both requests and can stop the second. Retries work the same way: each attempt is its own request through the transport.

The work is split so that each side stays simple. Go's documentation says `RoundTrip` should not handle redirects, authentication or cookies; those belong to `http.Client`.

| Job | Who does it |
| --- | --- |
| Follow a 302 or not | `http.Client` |
| Pick the cookies for the next request | `http.Client` |
| Send this one request and return its response | The transport |

Because every transport takes a `*http.Request` and returns an `*http.Response` and an error, transports fit inside each other, and each layer answers one question about one request:

| Layer | Its question |
| --- | --- |
| Guard | May this request be sent at all? |
| Retry | This attempt failed; send it again? |
| Proxy | Should this request go through the proxy's address? |
| `http.DefaultTransport` | Send it. |

If one layer handled a whole chain of requests, for example by following redirects itself, the layers outside it would never see the requests in the middle, and the guard could not stop them. Server middleware follows the same rule in the other direction: an Express middleware `(req, res, next)` handles one incoming request, which is why middlewares chain.

Layers stack: `readOnly{next: retry{next: proxy{next: http.DefaultTransport}}}`. Order matters. The guard goes outside the proxy layer, because a proxy layer rewrites the URL to the proxy vendor's address, and after that the guard could no longer tell which site the request was for.

## Is a mostly-client program a good fit for Go?

Yes, and it is one of the things Go is used for most.

| Kind of program | Written in Go |
| --- | --- |
| Crawlers | Colly |
| Command-line tools that call APIs | `gh`, `kubectl`, `terraform`, the `docker` CLI |
| Services that fetch data on a schedule | Prometheus, which scrapes metrics from every machine |
| Proxies and gateways (server and client at once) | Caddy, Traefik |

The reasons line up with what such a program needs:

- **Many connections at once are cheap.** Each one can run in its own goroutine, with no callbacks or promise chains.
- **Timeouts and cancellation have one mechanism.** A `context` carries the deadline from the scheduled run down to every request it makes.
- **It can run for hours.** A long-running Go process has no 300-second function limit, unlike a serverless function.
- **It ships as one file.** `GOOS=windows go build` produces an `.exe` that runs on an office PC with nothing else installed.

It is not the only good choice. A one-off script is quicker in Python or Node. A crawler that needs a real browser to render JavaScript is easier with Playwright, which is strongest in Node and Python.

> [!PRINCIPLE] Core principle
> Server and client are roles in one exchange, and a backend plays both. Put the rules for incoming requests in middleware and the rules for outgoing requests in the client's transport, where no call site can skip them.
