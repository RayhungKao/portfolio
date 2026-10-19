---
title: "Inside a backend: the request lifecycle"
date: 2026-10-18
summary: The five layers a request passes through, what each one is responsible for, and which error status each can return.
series: web-development
order: 603
part: Backend in practice
draft: false
---

**What you'll learn:** the five layers a request passes through inside a backend, what each layer is responsible for, and which status code each one is allowed to return.

A backend that grows in one file becomes a place where a SQL query, a permission check and a price calculation sit in the same function. The usual cure is to split the code into layers, so that each layer does one thing and can be changed without touching the others.

![Five layers a request passes through](diagram:backend-request-lifecycle)

Layers 2, 3 and 4 can each stop the request early. That is the point of the split: every kind of failure has exactly one place where it is detected.

## One request through five layers

Here is `POST /api/orders` in a Next.js route handler, with each layer marked by the number from the diagram.

```ts
// 1. Routing: this file's path (app/api/orders/route.ts) is the URL
export async function POST(request: Request) {
  // 2. Middleware, written inline: who is calling?
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'login required' }, { status: 401 })

  // 3. Handler: is the input the right shape?
  const parsed = orderSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'bad input' }, { status: 400 })

  try {
    const order = await createOrder(user.id, parsed.data)
    return Response.json(order, { status: 201 })
  } catch (e) {
    if (e instanceof OutOfStockError) return Response.json({ error: 'sold out' }, { status: 409 })
    throw e // anything unexpected becomes a 500
  }
}

// 4. Service: do the business rules allow it?
async function createOrder(userId: string, input: OrderInput) {
  return prisma.$transaction(async (tx) => {
    await reserveStock(tx, input.items) // throws OutOfStockError
    // 5. Data access: the only layer that writes SQL or ORM calls
    return tx.order.create({ data: { userId, items: input.items } })
  })
}
```

The handler knows about HTTP and nothing else: it reads the body, checks its shape, and translates errors into status codes. The service knows about the business and nothing about HTTP. It never sees a `Request`, so the same function can be called from an API route, a Server Action or a scheduled job. Data access knows about the database and nothing about rules.

## Two kinds of "invalid"

Validation and business rules look similar and are different questions.

| Question | Layer | Example | Status |
| --- | --- | --- | --- |
| Is the data shaped correctly? | Handler | `quantity` is a number, the email has an `@`. | 400 |
| Is it allowed in the current state of the world? | Service | The item is in stock, the coupon has not expired. | 409 |

A request can be perfectly formed and still wrong. "Buy 2 of product p1" is valid input, and it still fails when only one is left.

## 401 is not 403

These two get confused constantly. **401** means the server does not know who you are, so log in. **403** means it knows who you are and the answer is no. A visitor opening `/admin` gets 401; a logged-in customer opening `/admin` gets 403. The difference tells the client what to do next: a 401 sends the user to the login page, while a 403 shows "you do not have access" and sending them to log in again would be a loop.

## The statuses you will use most

| Status | Meaning | Example |
| --- | --- | --- |
| 400 | The input is malformed. | A negative quantity. |
| 401 | Not logged in. | The session cookie expired. |
| 403 | Logged in, not allowed. | A customer calls an admin endpoint. |
| 409 | The request conflicts with current state. | The last item was just bought. |

404 (not found) and 500 (our bug) round out the list, and the later articles on consistency and offline behaviour use them too.

## Middleware in Next.js 16

Next.js 16 renamed its middleware file. As of October 2026, `proxy.ts` replaces `middleware.ts`, which is deprecated. A project has one `proxy.ts`, and it runs before routes are matched, which makes it a good coarse gate: redirect anyone without a session cookie away from `/dashboard`. Do not treat it as the only check. Route handlers and Server Actions can be reached by other means, so each one still verifies the user itself, as the inline check above does.

## When you do not need a service layer

For a small app, a handler that validates and calls the ORM directly is fine. Add a service when the same rule is needed from a second place, or when a handler grows beyond what you can read at a glance. Layers are a cost, so pay for them when they start to save you something.

One rule holds at every size. Never build SQL by gluing strings from user input, because that is how SQL injection happens. Pass values as parameters and let the driver or ORM handle them; the examples above do this without any extra effort.

> [!PRINCIPLE] Core principle
> Each layer does one thing. Validation checks the shape of the data; business rules check the state of the world.
