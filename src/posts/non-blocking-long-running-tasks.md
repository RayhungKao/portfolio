---
title: How I made every long-running task in YCO non-blocking: fire it, keep working, never lose it
date: 2026-08-15
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7494301875429593088/
---
A lot of what our app does is heavy, server-side task processing: video generation, image editing, filter and effect application, and more. Any one of these can take anywhere from seconds to several minutes. The request was always asynchronous, but the experience was blocking. The UI waited on one task at a time, and navigating away killed it. So we moved task-tracking out of the page into a header-level monitor backed by IndexedDB, and turned it into one shared pattern that every task-processing feature uses. Now our users can queue many tasks, keep editing, switch tools, refresh the tab, even close it, and results still land with a red-dot notification.

🎨 Making the experience genuinely "non-blocking" is a different problem, with several axes:

1. Concurrent by design. We add a short debounce only to absorb an accidental double-fire from a single click, not to collapse intentional repeat submissions, so every deliberate click still spins up its own task.

2. Fire-and-forget. Polling lives in a route-independent header-level monitor, not in the page you launched from. On submit we push only the new task to Redux, so the job keeps running as you navigate anywhere in the app.

3. Crash-tolerant. Every task is persisted to a per-feature IndexedDB store, and the monitor rehydrates and resumes polling on mount. A refresh, an accidental tab close, or even a browser crash no longer loses an in-flight job. It picks up exactly where it left off.

4. Polite polling. Each task polls on a recursive `setTimeout` that waits for the interval the server asks for with one independent timer per task. A slow job automatically backs off instead of hammering the API on a fixed loop, and every task tears down its own timer the instant it reaches a terminal state, whether success or error.

5. Concurrency-safe. With many tasks in flight at once, completions and removals are funneled through a single delete queue guarded by an `isDeleting` flag, so overlapping finishes can't double-process the same task, and the red-dot store dedups with a membership check before notifying.

6. Sign-out safe. If you sign out while a job is still running, a guard cancels every pending timer, so we never keep polling the previous account's task under a guest token and trigger a 401 re-auth storm.

7. Failures don't stick. On error, the task is dropped from durable storage but kept in session state, so the failure is visible right now, but a transient glitch doesn't reappear on every future reload.

Because the request was already async. A non-blocking experience includes durability, resumability, backoff, concurrency, auth correctness, double-submit protection, and each one is a deliberate design decision.
