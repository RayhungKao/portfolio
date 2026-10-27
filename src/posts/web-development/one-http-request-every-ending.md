---
title: "One HTTP request, every way it can end"
date: 2026-10-27
summary: "A single outgoing request can succeed, come back with an error status, time out, lose its connection or be cancelled. A line-by-line walk through one Go function that handles all of them, with the ideas beginners trip on: context, the response body as a stream, the connection pool, defer, and error versus panic."
series: web-backend
order: 109
part: How a backend works
draft: true
---

**What you'll learn:** every way one HTTP request can end, and how a Go function handles each one: what a context is for, why a response body is a stream you must close, what the connection pool saves, where `defer` belongs, and why a failed request is an `error` and never a `panic`.

Most of what a web app does is send or answer HTTP requests, and most of the bugs live in the cases nobody tried: the slow server, the 500, the connection that drops halfway. [Your backend is also a client](/blog/backend-as-a-client) showed the layers around outgoing requests. This article zooms into the innermost one, the function that sends a single request, and follows it through every ending.

## Every way a request can end

| Ending | What came back | What the caller should do |
| --- | --- | --- |
| Success | A 2xx status and a body | Use the body |
| Error status | A response with 4xx or 5xx | Decide by status: retry a 503, give up on a 404 |
| Network failure | No response: DNS failed, connection refused or reset | Usually retry; the site may be down |
| Timeout | No response before the deadline | Retry or give up; do not wait forever |
| Cancelled | The caller stopped the work | Stop at once; do not retry |
| Bad request | The URL could not even be parsed | A bug or bad data; report it |

The second row surprises people: **a 500 is not a failure of the request**. The server answered. Only the last four rows mean no response arrived at all.

## The function

This is a slightly simplified version of the function a Go crawler uses to fetch one page. Line numbers are used in the walkthrough below.

```go
func (c *Client) getOnce(ctx context.Context, url string, timeout time.Duration) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)                // 1
	defer cancel()                                                  // 2

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil) // 3
	if err != nil {                                                 // 4
		return nil, err                                             // 5
	}
	req.Header.Set("Referer", "https://www.example.com/")           // 6

	res, err := c.http.Do(req)                                      // 7
	if err != nil {                                                 // 8
		return nil, &FetchError{URL: url, SiteDown: true, Err: err} // 9
	}
	defer res.Body.Close()                                          // 10

	if res.StatusCode < 200 || res.StatusCode >= 300 {              // 11
		return nil, &FetchError{URL: url, Status: res.StatusCode}   // 12
	}
	return io.ReadAll(res.Body)                                     // 13
}
```

It takes a context, a URL and a time limit, and returns the page as bytes, or an error. Go functions report failure by returning an `error` as their last value; there is no `try`/`catch`. The caller checks `if err != nil` straight after every call.

## Context: a cancel signal passed down

Line 1 derives a new context from the one the caller passed in, with a deadline added. A context is a signal that says "stop": it fires when its deadline passes or when whoever created it cancels it. JavaScript has the same idea as `AbortController` and `AbortSignal`.

| JavaScript | Go |
| --- | --- |
| `new AbortController()` plus `setTimeout(() => c.abort(), 12000)` | `ctx, cancel := context.WithTimeout(ctx, 12*time.Second)` |
| `fetch(url, { signal })` | `http.NewRequestWithContext(ctx, …)` |
| `clearTimeout(timer)` | `defer cancel()` |

Contexts form a tree. Cancel a parent and every child below it stops too:

```text
context.Background()                      the root, never cancelled
  └─ signal.NotifyContext(…)              cancelled on Ctrl+C or a shutdown signal
       └─ WithTimeout(…, 5 minutes)       one whole crawl run
            └─ WithTimeout(…, 12 seconds) this one request
```

`context.Background()` belongs only at the very top, in `main` or in a test. Everything else receives a context and passes it on. That habit is the point: when the server is redeployed and receives a shutdown signal, the root is cancelled, and a request that would have waited another 70 seconds for a slow proxy stops immediately.

Line 2 matters too. `WithTimeout` starts a timer; `cancel()` releases it. A request that finishes in one second would otherwise leave its timer running for eleven more. `go vet` warns when a `cancel` is never called.

## Building a request can fail without touching the network

Line 3 does not send anything. It builds a request object, but building it means parsing the URL string, and that can fail:

```go
req, err := http.NewRequestWithContext(ctx, "GET", "https://[bad", nil)
// req is nil
// err: parse "https://[bad": missing ']' in host
```

A crawler takes URLs from pages it does not control, so a malformed one is a real possibility. That is the "bad request" row of the table.

Line 6 sets a request header. `Referer` tells the site which page the visitor came from; a browser sends it automatically when you click a link. A crawler sets it so its requests look like ordinary navigation, because some sites refuse requests without one.

## A response arrives in two parts

Line 7 is the only line that touches the network. An HTTP response comes back in two pieces:

```text
HTTP/1.1 200 OK               ← status line and headers: small, arrive first
Content-Type: text/html

<html> … </html>              ← body: can be large, streams in afterwards
```

`Do` returns as soon as the first piece arrives. At that moment `res.StatusCode` is known, but `res.Body` is not the page yet. It is a stream still attached to the connection, and the bytes come in only as you read them. Line 13, `io.ReadAll`, reads until the stream ends and returns everything as a byte slice (`[]byte`). Text arrives as bytes; `string(body)` turns it into a string.

The stream design lets the caller choose. A 1 GB download does not have to fit in memory, and a 500 response, as on line 12, need not be read at all.

## Close the body, so the connection can be reused

Opening an HTTPS connection costs round trips before any data moves: a TCP handshake, then a TLS handshake. Across an ocean that can be hundreds of milliseconds.

So Go's `http.Transport` keeps finished connections in a **pool**. The next request to the same host takes one from the pool and skips both handshakes.

```text
request 1 to example.com: handshake → request → response → connection back to the pool
request 2 to example.com: take from the pool → request → response   (no handshake)
```

A connection can go back only when its response body has been closed. Until then data may still be in flight on it. Forget to close bodies and connections pile up until the program runs out of them. That is why line 10 exists, and why it is one of the most common bugs in Go code that makes HTTP requests. (To be reused, a body should also be read to the end. Code that skips reading an error response can drain it first with `io.Copy(io.Discard, res.Body)`.)

## Where the `defer` lines go

`defer` schedules a call for when the function returns, by any `return`, in last-in, first-out order. It is Go's version of `finally`.

The two `defer` lines sit exactly where they do for a reason:

- **Line 2 follows line 1 directly.** The moment there is something to release, its release is scheduled, so no later `return` can skip it.
- **Line 10 comes after the `err` check on line 8, not before.** When `Do` fails, `res` is `nil`. A `defer res.Body.Close()` placed above the check would, at return, try to read a field through a nil pointer, and the program would crash.
- **Neither is inside a loop.** A deferred call runs when the function returns, not when a loop iteration ends. A retry loop that deferred `cancel()` on every attempt would keep every timer alive until all attempts were over. That is why "send one request" is a function of its own, called once per attempt.

## The three endings, traced

The same function, three inputs:

| | Success | Status 500 | Timeout |
| --- | --- | --- | --- |
| Line 7 `res` | a response | a response | `nil` |
| Line 7 `err` | `nil` | `nil` | `Get "…": context deadline exceeded` |
| Returns at line | 13 | 12 | 9 |
| Line 10 runs? | yes | yes | no: `res` is `nil` |
| Deferred calls at return | close body, then `cancel` | close body, then `cancel` | `cancel` |
| Result | `(page, nil)` | `(nil, FetchError{Status: 500})` | `(nil, FetchError{SiteDown: true})` |

The timeout case still lets the caller see why it failed. `FetchError` keeps the original error and exposes it through an `Unwrap` method, so `errors.Is(err, context.DeadlineExceeded)` is true. A caller can then tell "the site was slow" from "the site said no".

## An error is not a panic

A **panic** is Go's crash: the program prints a stack trace and stops, like an uncaught exception in JavaScript. Go separates two kinds of trouble:

| | When | Examples | How to handle |
| --- | --- | --- | --- |
| `error` | Failures you expect | Site down, timeout, wrong password | Return it; the caller decides |
| `panic` | The program itself is wrong | Reading through a nil pointer, an index out of range | Fix the code |

A slow or broken website is an ordinary day for a crawler, so every ending in the table at the top comes back as an `error`. A panic in this function would mean a bug, such as the misplaced `defer` above.

## Why Go suits programs that mostly send requests

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
> One request has many endings, and only one of them is success. Give each ending its own path: pass a context so it can be stopped, close every body so its connection can be reused, and return failures as errors that say which ending happened.
