---
title: "How I built YCO's AI Agent: a streaming, multimodal chat that runs the whole platform from a single prompt"
date: 2026-07-25
category: AI Agent
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7486691736392585217/
---
An AI assistant that edits and generates your photos is really four frontend problems at once: streaming responses, on-device media compute, routing one prompt to the right feature, and keeping the conversation durable.

🤖 The AI Agent lets users trigger any feature across the YCO platform with just a prompt and uploaded images, no hunting through separate tools. It streams the reply live, edits or generates photos and videos inline, and remembers every chat. Four main pieces make it work:

1. Smooth streaming replies. The backend streams tokens over SSE, but the JSON envelope often arrives truncated mid-flight. I reconstruct the partial message as tokens land so text renders live, and pin the view to the newest content with a scroll state machine that still lets users scroll up to read earlier turns without the stream yanking them back.

2. Client-side, privacy-preserving media. Basic edits (brightness, contrast, saturation, temperature) run in the browser with Fabric.js on WebGL, so the image is never uploaded. Each photo gets a SHA-256 fingerprint that drops duplicate uploads and reuses one preview per unique image, EXIF orientation is baked into the pixels so the backend sees it upright, and Human.js detects the main face on-device to route to the right tool.

3. One prompt, the whole platform. A prompt plus image/video is routed through a priority ladder: in-browser filter, client-triggered task, dedicated tool page, then server task. Structured action payloads make the backend run the feature instead of describing it, and fuzzy matching maps a loose style name to the real catalog item.

4. Durable, resumable chats. Each chat is cached in two tiers (in-memory for fidelity, local storage for reloads) and tied to its owner so nothing leaks across accounts. On reload it shows instantly then reconciles with the server, survives the ~30s lag before a new chat is queryable, shows a real title immediately, and cancels stale polling the moment you switch chats.

✅ A few smaller pieces earn their place:

5. Multi-photo, multi-source input. Attach up to 9 photos per message from either the file picker or My Gallery, both funneled through the same batch upload with content-hash de-duplication and one shared limit, so the two paths behave identically.

6. Live credit and quota costs. Resolve per-task cost and per-tier quota from app settings at send time, so the number shown matches what gets charged.

7. Sanitized markdown. Render with marked, then sanitize through DOMPurify before it ever touches the DOM.

🤔 The call I'd defend: identify media by its bytes.

Filenames and a stapled sourceUrl both lie the moment the same image arrives from a different path: a re-upload, a reused result. Hashing the actual bytes gives one stable identity, so dedup and cache reuse just work, and the photo never leaves the browser to be recognized.
