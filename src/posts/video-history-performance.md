---
title: How I made YCO's video history handle media-heavy list performance
date: 2026-07-12
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7481974349168566272/
---
Media-heavy list performance requires network, main-thread, data-structure, pagination, and memory. Picking a technique means knowing exactly which axis it acts on.

Every user in our app has their own video history, with all their generated videos fetched and rendered in chronological order, each in whatever state it's in: done, still processing, or failed. It's the nastiest shape a frontend list can have: unbounded, media-heavy, and mixed-state. Early on it was capped at 30 items and still stuttered. Four main changes fixed it:

1. Cursor pagination. Load metadata for 30 videos at a time via a `cursor` until it returns `null`, instead of everything, so the artificial cap disappeared with no bandwidth hit.

2. Lazy-load the media. Each item starts with `preload="none"` plus a `poster`, and we only fetch the actual video bytes when it's about to enter the viewport (using IntersectionObserver with a pre-warm margin). Initial load dropped ~95%.

3. Never lock the main thread. Hydrate results in small chunks and yield to the browser between them (`yieldToMain` via setTimeout(0)), batching state updates instead of one per item fetched, so the UI stays responsive while the whole history renders in the background.

4. Fix redundant work at O(n²) complexity. Dedup the merged results at the write boundary with a `Set` instead of nested array scans.

✅ Beyond those four, heavy-media performance has a checklist worth naming:
5. Cap concurrent media fetches. Don't let a fast scroll fire dozens of requests at once.

6. Fix the aspect-ratio of containers to reserve space and kill layout shift (CLS) as media pops in.

7. `posters`/thumbnails as placeholders, so nothing shows a blank or downloads a full frame just to render.

8. Native `loading="lazy"` + `decoding="async"` for images. The free, zero-JS version of what our IntersectionObserver does for video.

9. Debounce hover-to-autoplay. Only the tile you actually settle on starts playing (300ms debounce, cancelled if you leave). Sweeping the mouse across the grid no longer fires a play() + decode on every video it crosses.

🤔 Finally, we may ask "why IntersectionObserver and not list virtualization?"

Because they don't solve the same problem. IntersectionObserver controls bytes: what downloads. Virtualization controls DOM nodes: what stays mounted. We want smooth UX so we keep our user's loaded buffer in case they scroll away and back immediately, so replaying an older video is then instant. Virtualization unmounts off-screen items and destroys that. It also would have broken the imperative refs our video players expose.
