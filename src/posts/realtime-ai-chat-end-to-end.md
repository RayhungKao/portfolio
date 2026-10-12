---
title: Building a real-time AI chat end to end, from a frontend engineer's side of the stack
date: 2026-08-01
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7489228431860350976/
---
💡 I built and own most of the frontend architecture of the YCO AI Agent, a streaming multimodal AI chat. But I wanted to understand the whole machine, not just the surface I own. So as a side project I built an entire real-time AI chat end to end: the group-chat UI, the backend, and a fake LLM service. I treated it as a system-design exercise rather than a frontend one.

The app itself is small. It's a group chat where an AI joins in, answers about half the messages with a lifelike delay, and streams its reply word by word. But building all three tiers myself surfaced four decisions I'd normally inherit from a backend team. Sharing them for other frontend folks curious about stepping across the stack:

1. How messages reach everyone. The flow is one-way push (server→client) plus the occasional message upstream, so I used Server-Sent Events. SSE reconnects for free via EventSource, rides plain HTTP so proxies and CDNs just work, and keeps the transport tiny.

2. Making the AI type live, from the server side. The bot sends one message id up front, then growing frames that share it. The client upserts by id, so the bubble grows in place with a cursor instead of spamming a line per word.

3. Not losing messages across restarts and dropped connections. Messages persist and replay on connect, so late joiners get the full thread and a restart loses nothing. I save only the final text, so a replay shows one clean message, never the half-typed frames.

4. Staying up when a model instance dies. With a pool of fake-LLM instances, I load-balanced by least-busy, timed out slow calls, and added a circuit breaker that ejects a failing instance and later probes it, so a reply never silently drops.

One last touch: per-client rate-limiting on sends, so a single runaway tab can't flood the room or overwhelm the model pool.

🤔 The obvious question: why not WebSocket?
For mostly one-way push, SSE does the job with less code and free reconnection. WebSocket earns its keep when traffic turns genuinely two-way: live presence, typing indicators, or an encrypted key handshake. Add those and I'd reach for it. The point is fitting the tool to the problem and keeping the transport easy to swap when the problem changes.
