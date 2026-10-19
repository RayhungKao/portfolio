---
title: "Realtime in practice: polling, SSE, WebSocket and who holds the connection"
date: 2026-10-18
summary: "Three ways to push updates to a browser, and three ways to decide who keeps the connection open."
series: web-development
order: 707
part: Deep dives
draft: false
---

**What you'll learn:** how polling, Server-Sent Events and WebSockets differ, and three ways to run the part that keeps connections open.

Ordinary HTTP only lets the browser ask. If the server has news, such as a new chat message or a rider's new position, it has no way to tell the browser. Realtime is the set of tricks that fix this.

![Normal HTTP versus a WebSocket](diagram:http-vs-websocket)

With normal HTTP the browser keeps asking "any new message?" With a WebSocket it opens one connection and the server speaks whenever it has news.

## Three ways to get news to the browser

![Polling, Server-Sent Events and WebSocket compared](diagram:polling-sse-websocket)

| Way | How it works | Direction | Example |
| --- | --- | --- | --- |
| Polling | The browser asks again every few seconds | Browser asks, server answers | An order status page checked every 10 seconds |
| Server-Sent Events (SSE) | One HTTP request stays open and the server streams events | One way, server to browser, over plain HTTP | An AI reply streaming in word by word |
| WebSocket | One connection is opened and either side can send at any time | Two ways | Chat messages, a delivery rider's location |

Start with the simplest one that is good enough. Polling is wasteful but needs nothing special. SSE is a few lines on each side:

```ts
// server (a route that never finishes)
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => controller.enqueue(`data: ${text}\n\n`)
      const timer = setInterval(() => send(JSON.stringify({ at: Date.now() })), 5000)
      // clean up with controller.close() and clearInterval when the client leaves
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

```ts
// browser: EventSource reconnects by itself if the connection drops
const source = new EventSource('/api/stream')
source.onmessage = (event) => console.log(JSON.parse(event.data))
```

Choose a WebSocket when the browser also needs to send often and quickly (chat, shared cursors), not just receive.

## Who holds the connection open?

A connection that stays open needs something to stay alive for hours, and that something is not a serverless function, because functions have a time limit. There are three arrangements.

![Three ways to run the part that holds connections](diagram:three-ways-to-realtime)

### 1. Supabase Realtime: the database pushes

The browser subscribes, and Supabase watches the table and pushes changes over a WebSocket. You write only the subscribe code:

```ts
supabase
  .channel('notes-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
    console.log('changed:', payload.new)
  })
  .subscribe()
```

Fits a notes list that updates live. Row-level security still decides which rows each user receives.

### 2. Ably or Pusher: your function publishes

A hosted service holds every browser connection. Your function never holds one: it makes a short HTTP call to publish.

```ts
// inside a webhook function: tell the page "paid"
import Ably from 'ably'

const ably = new Ably.Rest(process.env.ABLY_API_KEY!)
await ably.channels.get(`order-${orderId}`).publish('paid', { orderId })
```

The browser subscribes to the channel `order-123` through the provider's client library. Because the function only makes one call and exits, the time limit does not matter.

### 3. Your own WebSocket server

You run a process that holds every connection.

```ts
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })
wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === client.OPEN) client.send(data.toString())
    }
  })
})
```

This is the most flexible and the most work. Real chat or location tracking needs these as well:

- **Authentication at connect time.** A browser cannot set headers on a WebSocket, so use a cookie or send a token as the first message.
- **Heartbeats and reconnecting.** Connections die silently; ping on a timer and let the client reconnect with backoff.
- **More than one server.** A message arriving at server A must reach clients connected to server B, usually through a shared channel such as Redis pub/sub.

## Choosing

| If you need | Pick |
| --- | --- |
| Live updates of data already in your database | Supabase Realtime |
| Pushing events from serverless functions, without running servers | Ably or Pusher |
| Two-way, high-frequency messaging that you control | Your own WebSocket server |
| Only occasional updates | Polling, or SSE if the server already pushes |

> [!PRINCIPLE] Core principle
> Choose the simplest way that meets the need, and decide first who holds the open connection. A serverless function cannot.
