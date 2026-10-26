---
title: "How I made YCO's video history handle a media-heavy list"
date: 2026-07-12
category: Performance
summary: "Performance on a media-heavy list comes down to four axes: network, main thread, data structures, and memory. Picking a technique means knowing which axis it acts on."
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7481974349168566272/
---
Performance on a media-heavy list comes down to four axes: network, main thread, data structures, and memory. Picking a technique means knowing which axis it acts on.

Every user has their own video history: all their generated videos, newest first, each one done, still processing, or failed. That makes it the hardest shape a frontend list can have: unbounded, media-heavy, and mixed-state. Early on it was capped at 30 items and still stuttered.

## Four fetches per item

| What | When | How many |
| --- | --- | --- |
| List metadata (id, type) | On page entry | Every page, 30 at a time |
| Detail JSON (video URL, poster URL, prompt, model) | After the whole list has loaded | Every item: 5 at a time for the first 15, then 3 |
| Poster image | When its card mounts | Every card |
| Video (mp4) | When its tile nears the viewport | Only the tiles near the screen |

## Five changes

**1. Cursor pagination + head sync (network).** We load the list 30 items at a time until the cursor returns `null`. Within a session, we fetch only from the top until we hit an id we already have, then prepend what's new. No refetching the whole history.

**2. Chunked detail fetches that yield (main thread).** Each item needs its own detail request: 5 in flight for the first screen, then 3 at a time. We yield to the browser between chunks with `setTimeout(0)`. Details are LRU-cached, and cache hits resolve almost synchronously, so without the yield a re-run would become one long task. Why not `scheduler.yield()`? It's in Chrome and Edge 129+ and Firefox 142+, but not in Safari. The next step is to feature-detect it and fall back to `setTimeout`.

**3. Batched store updates + Set dedup (main thread, data structures).** Results flush at most every 500ms, and the first flush is immediate. Each batch is one store update and one render, so cards mount in batches rather than one by one. Redux selectors and `React.memo` keep a flush from re-rendering cards that didn't change. The reducer dedups against a `Set` of existing ids instead of nested array scans, so it's O(n), not O(n²).

**4. Wire videos only when they're near the viewport (network, memory).** Every `<video>` starts with `preload="none"` and no source. When a tile comes within 200–400px of the viewport, an IntersectionObserver sets its `<source>` and calls `load()`. In Chrome, that path starts buffering a few seconds of video right away, and `preload="none"` doesn't stop it. We didn't design it that way, but it works for us: playback and replays start instantly. If bandwidth mattered more, we could set `video.src` instead: in Chrome, the video then waits at 0 bytes until it plays, at the cost of a short delay on first play. Off-screen tiles pause but keep their buffer. First-load video bandwidth dropped ~95%.

**5. Debounced hover-to-autoplay (main thread).** Only the tile you settle on for 300ms starts playing, and leaving cancels it. Sweeping the mouse across the list no longer fires a `play()` and a decode on every tile.

## Also in place

- **Fixed aspect-ratio containers.** Each card reserves its space up front, so nothing shifts the layout (CLS) as media loads in.
- **Native `loading="lazy"` + `decoding="async"` for images.** The free, zero-JS version of what our IntersectionObserver does for video.

## Why IntersectionObserver and not virtualization?

They solve different problems. IntersectionObserver controls which videos download. Virtualization controls which DOM nodes stay mounted. We keep cards mounted so a buffered video replays instantly and our players' imperative refs stay intact.

The cost is real. DOM size grows with history length, and a buffer only survives while its card stays mounted: switching the type filter unmounts cards, and their buffers go with them. If histories keep growing, virtualization comes back on the table, and the hard part will be keeping buffers alive across unmounts.

## Not done yet

- **Lazy posters.** Every card's poster loads as soon as it mounts, so a long history still downloads every thumbnail up front.
- **Start hydration earlier.** Details wait until the whole list has loaded, so a longer history delays the first card.
