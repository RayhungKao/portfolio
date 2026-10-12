---
title: Why chat apps lock the message box while a reply streams
date: 2026-09-12
category: AI Agent
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7504403672907460608/
---
💡 ChatGPT, Claude, Gemini and Perplexity all disable the message box while a reply streams. Reasonable product choice, and it keeps a whole class of bug out of their codebase.

I hit that class in a chat UI that let you send again mid-reply. Answers stream token by token, and each token gets appended to the last message in the list. That lookup runs at token time. Send a second question and the list grows, so by the time the next token lands, the last element belongs to the newer reply. Both streams then write into the same bubble.

What you actually see:
- two answers interleaved in one bubble, still reading like English
- the earlier reply frozen half-finished, cursor blinking forever
- a reply that shows as finished and then keeps typing

It never throws, so users file it as the model being confused. The fix was to capture the reply's id when the stream starts and match on that, which cleared all three symptoms at once.

Two follow-ons worth knowing:
1. Cancelling needs its own cleanup. The Stop button I added left every cancelled reply marked as still generating. The abort check runs before the completion callback, so cancelling returns early and that callback never fires. Stop has to clear the state itself.
2. Memoising did nothing until the props could match. The message component received fresh callbacks on every render, so the comparison failed every time. Until I stabilised those, every token re-rendered every message on screen. Afterwards, only the one that changed.

The rule I'd keep: identify a stream by the id of the thing it owns. Position stays correct only while exactly one stream exists.
