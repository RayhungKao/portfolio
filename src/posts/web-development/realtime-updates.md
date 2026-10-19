---
title: "Realtime updates: polling, SSE, WebSocket and who holds the connection"
date: 2026-10-18
summary: "Three ways to push updates to a browser, and three ways to decide who keeps the connection open."
series: web-development
order: 702
part: Going further
draft: false
---

**What you'll learn:** how polling, Server-Sent Events and WebSockets differ, why a serverless function cannot hold a connection, and three ways to run the part that does.

Ordinary HTTP only lets the browser ask. If the server has news, such as a new chat message or a rider's new position, it has no way to tell the browser. Realtime is the set of tricks that fix this.

![Normal HTTP versus a WebSocket](diagram:http-vs-websocket)

With normal HTTP the browser keeps asking "any new message?" With a WebSocket it opens one connection and the server speaks whenever it has news.

## Three ways to get news to the browser

![Polling, Server-Sent Events and WebSocket compared](diagram:polling-sse-websocket)

| Way | How it works | Direction | Example |
| --- | --- | --- | --- |
| Polling | The browser asks again every few seconds | Browser asks, server answers | An order status page checked every 10 seconds |
| Server-Sent Events (SSE) | One HTTP request stays open and the server streams events; the browser's `EventSource` reconnects by itself if it drops | One way, server to browser, over plain HTTP | An AI reply streaming in word by word |
| WebSocket | One connection is opened and either side can send at any time | Two ways | Chat messages, a delivery rider's location |

Start with the simplest one that is good enough. Polling is wasteful but needs nothing special, and an order status page rarely needs more. Choose a WebSocket when the browser also needs to send often and quickly (chat, shared cursors), not just receive.

## Who holds the connection open?

An open connection needs a process that stays alive for hours. A serverless function is not one: it has a time limit and remembers nothing between calls. So the question is who holds the connection. There are three arrangements.

![Three ways to run the part that holds connections](diagram:three-ways-to-realtime)

| Arrangement | How it works | Options | Pick it when (example) | What you give up |
| --- | --- | --- | --- | --- |
| The database pushes | The platform watches your data and pushes changes to subscribed browsers. | Supabase Realtime (Postgres Changes over WebSockets, filtered by your row-level security policies); Convex (queries re-run when data changes and results are pushed to subscribed clients); Appwrite Realtime | The screen is a live view of rows you already store. E.g. a notes list that updates on every device. | You are tied to that platform, and only data that lives in its database can be pushed. |
| A hosted pub/sub service | A service holds every browser connection. Your function only publishes, with a short call. | Ably (a server can publish over REST without a persistent connection); Pusher Channels (WebSockets with fallbacks, private and presence channels); Supabase Realtime Broadcast | A serverless webhook must tell the page "paid". E.g. a payment provider calls your function, which publishes to the channel `order-123`. | A separate service to pay for. Messages are events, not rows in your database. |
| Your own WebSocket server | You run a process that holds every connection. | A WebSocket library in your language, on a VPS or container | Two-way, high-frequency messaging you control. E.g. chat, or shared cursors in an editor. | The most work (see below). |

An own server needs three things the other two give you for free:

- **Authentication when connecting.** A browser cannot set custom headers on a WebSocket, so use a cookie or send a token as the first message.
- **Heartbeats and reconnecting.** Connections die silently, so ping on a timer and let the client reconnect with backoff.
- **More than one server.** A message arriving at server A must reach clients connected to server B, usually through a shared channel such as Redis pub/sub.

## Choosing

| If you need | Pick | Example |
| --- | --- | --- |
| Only occasional updates | Polling, or SSE if the server already pushes | Order status |
| Live updates of data already in your database | A database that pushes | Notes list |
| Pushing events from serverless functions | A hosted pub/sub service | "Payment received" |
| Two-way, high-frequency messaging that you control | Your own WebSocket server | Chat |

The products above were checked against their own documentation in October 2026.

> [!PRINCIPLE] Core principle
> Choose the simplest way that meets the need, and decide first who holds the open connection. A serverless function cannot.
