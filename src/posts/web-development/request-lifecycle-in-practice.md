---
title: "The request lifecycle in practice: middleware, shared services and validation"
date: 2026-10-18
summary: "How a middleware chain stops a request early, how three entry points share one service, and what Zod validation looks like."
series: web-backend
order: 402
part: Backend in code
draft: true
---

**What you'll learn:** how a middleware chain short-circuits, how one service serves several entry points, and how to validate input with Zod.

[Inside a backend](/blog/inside-a-backend) walks one request through five layers. This article zooms in on three details.

## Middleware is a chain that can stop

Middleware is a function that sees the request before the handler does. Several of them form a chain, and each one either passes the request on or answers it itself.

![A request through logging, body parsing and authentication, stopped by a 401](diagram:middleware-chain-with-short-circuit)

In Express the chain is a series of `app.use` calls, and the order is the order of execution:

```ts
import express from 'express'

const app = express()

app.use((req, _res, next) => {            // 1. logging: always passes on
  console.log(req.method, req.path)
  next()
})

app.use(express.json())                   // 2. body parsing: JSON text into req.body

app.use(async (req, res, next) => {       // 3. authentication: may stop the chain
  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'login required' }) // short-circuit
  req.user = user
  next()
})

app.post('/api/orders', async (req, res) => { // 4. handler: runs only if all pass
  res.status(201).json(await placeOrder(req.user.id, req.body))
})
```

A middleware that does not call `next()` and does not answer leaves the request hanging, which is the classic bug in this style. The first two middlewares never stop a request; the third stops it with a 401 and the handler never runs. Order matters: if authentication came before body parsing, it could not read a token sent in the body.

## One service, three callers

A service function knows the business rules and nothing about HTTP, so several entry points can call it.

![A route handler, a Server Action and an admin script all call one service](diagram:service-reused-by-multiple-callers)

| Caller | Who uses it | What it does before calling the service |
| --- | --- | --- |
| Route Handler | A mobile app, over `POST /api/orders` | Reads the bearer token, parses JSON |
| Server Action | The web checkout form | Reads the session cookie, reads `FormData` |
| Admin script | A staff member placing an order for a customer | Checks that the script runs with staff credentials |

```ts
// the one place the rules live
export async function createOrder(userId: string, input: OrderInput) {
  // stock check, pricing, writing the order...
}
```

Each caller authenticates and parses in its own way, then calls `createOrder`. The rule "no order above the stock level" exists once. If it lived in the route handler, the Server Action would need its own copy, and the two would drift apart.

## Validating input with Zod

A handler must treat every request body as untrusted. Zod describes the expected shape once, checks it at runtime, and gives you the TypeScript type for free.

```ts
import { z } from 'zod'

const orderSchema = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) }))
    .min(1),
  note: z.string().max(200).optional(),
})

type OrderInput = z.infer<typeof orderSchema>   // the type, with no second definition

const parsed = orderSchema.safeParse(await request.json())
if (!parsed.success) {
  // a flat object: { formErrors: [], fieldErrors: { items: ['Too small: ...'] } }
  return Response.json({ errors: z.flattenError(parsed.error) }, { status: 400 })
}
// parsed.data is typed as OrderInput and has been checked
```

Three details are worth knowing:

- **Use `safeParse`.** `parse` throws an exception on bad input, and an unhandled one becomes a 500, which blames your code for the client's mistake.
- **Shape errors are not business errors.** A quantity of `-3` is a 400 from validation. "Out of stock" is a 409 from the service. See "Two kinds of invalid" in [Inside a backend](/blog/inside-a-backend).
- **Format errors for the reader.** `z.flattenError` suits a flat form. For nested data, `z.treeifyError` mirrors the schema's structure, and `z.prettifyError` produces a readable string for logs.

The ORM, query patterns and the N+1 problem are not covered here.

> [!PRINCIPLE] Core principle
> Middleware answers "may this request continue?", a service answers "do the rules allow it?", and validation answers "is the input shaped right?" Keep the three apart.
