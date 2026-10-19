---
title: What the user sees, online and offline
date: 2026-10-18
summary: How status codes turn into screens, how an offline action moves through five states, and which actions should never be queued.
series: web-development
order: 608
part: Backend in practice
draft: false
---

**What you'll learn:** how each status code maps to what the user sees, the five states of an action made while offline, and which actions should not be queued at all.

The last two articles ended with status codes: 400, 401, 409. A code is only useful if the interface does something sensible with it. That takes agreement between the two sides.

## From status code to screen

| Response | What the user should see | Example |
| --- | --- | --- |
| 2xx | The screen updates and confirms. | "Order placed" with an order number. |
| 400 | The problem is shown next to the field. | "Quantity must be at least 1." |
| 401 | The user is sent to log in, and returns afterwards. | A session expired while filling a form. |
| 403 | An explanation, not a login loop. | "Only admins can change prices." |
| 404 on a delete | Treated as done. | The file was already deleted on another device. |
| 409 | A conflict dialog with choices. | "This document changed. Reload, or overwrite?" |
| 5xx | A generic error, the input kept, a retry offered. | "Something went wrong. Try again." The typed text is still there. |

Two techniques make the interface feel fast. **Optimistic UI** shows the result before the server answers and rolls back on failure. React 19 has `useOptimistic` for this, and TanStack Query supports rollback on a failed mutation. For work that takes a while, such as exporting a report, the server answers `202 Accepted` at once and the page shows "in progress" while the job runs.

## Five states of an offline action

When a phone has no signal, tapping "send" should not fail. The app records the intent and sends it later. Each such action passes through five states.

![Five states of an action made while offline](diagram:offline-action-five-states)

You already know these from messaging apps. A message in the Gmail Outbox is **Queued**. WhatsApp's clock icon means **Sending**. A single tick means the server has it, which is **Synced**. The double tick that follows, delivered and read, belongs to a different layer: it tells you about the other person's phone.

An action in **Retrying** has an unknown result: the request left, and the answer never came. The app retries with the same idempotency key, so a request that did arrive is not applied twice. A clear refusal, such as 400, 403 or 409, moves it to **Rejected**, because retrying cannot help. The user then sees an error and choices.

## What each side promises

Offline behaviour works only if the client and the server follow the same agreement.

| Goal | Client does | Server does |
| --- | --- | --- |
| No double clicks | Disables the button and sends an idempotency key. | Returns the earlier result for a repeated key. |
| Do not overwrite others | Sends the version it saw. | Checks the version, answers 409 on a mismatch. |
| Work made offline survives | Keeps the action in a local outbox until confirmed. | Accepts it later and in the order sent. |
| No oversell | Treats a 409 as a normal outcome. | Uses an atomic update. |

> [!WARNING] Not every action should be queued offline
> Payments, ticket grabbing and limited-stock checkouts should be disabled offline, with a message such as "requires a connection". By the time the phone reconnects, the price may have changed or the stock may be gone, and the user would be surprised by a charge they thought had failed.
>
> Queue only actions that are low-risk, reversible and safe to repeat: sending a message, saving a note, ticking a to-do, giving a like.

## Deleting cloud files

Deleting is the subtle case, and it depends on whether a trash bin exists.

> [!WARNING] Deleting cloud files offline
> A **soft delete** moves the file to the trash, where it can be restored. That is safe to queue. A **permanent delete** should be disabled offline, or confirmed again after the phone reconnects.

The client does not queue "delete file f1". It queues the intent: "delete f1, and the version I saw was 7". The server deletes only if the version still matches. If somebody edited the file in the meantime, it answers 409 ("already modified, kept") and the file survives.

```sql
UPDATE files SET deleted_at = now()
WHERE id = $1 AND version = $2 AND deleted_at IS NULL;
```

Zero rows changed has two meanings that the handler tells apart: the file is already deleted, which counts as done, or the version differs, which is a 409.

> [!NOTE] Where the rest lives
> The outbox, ordering of actions per object, the reconnect response table, background sync and retry backoff belong to the offline-sync topic series.

> [!PRINCIPLE] Core principle
> The mechanism works only when the client and the server follow the same agreement about what each response means.
