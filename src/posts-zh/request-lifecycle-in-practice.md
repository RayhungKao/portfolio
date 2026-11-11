---
title: "請求生命週期實務：middleware、共用的 service 與驗證"
---

**你會學到：** middleware 鏈怎麼提早中止、一個 service 怎麼服務好幾個入口，以及怎麼用 Zod 驗證輸入。

[後端內部](/blog/inside-a-backend)帶一個請求走過五層。這篇放大其中三個細節。

## Middleware 是一條可以中止的鏈

Middleware 是一個在 handler 之前看到請求的函式。好幾個 middleware 組成一條鏈，每一個不是把請求往下傳，就是自己回應。

![A request through logging, body parsing and authentication, stopped by a 401](diagram:middleware-chain-with-short-circuit)

在 Express 裡，這條鏈是一連串的 `app.use` 呼叫，順序就是執行的順序：

```ts
import express from 'express'

const app = express()

app.use((req, _res, next) => {            // 1. 記錄：一律往下傳
  console.log(req.method, req.path)
  next()
})

app.use(express.json())                   // 2. 解析 body：把 JSON 文字轉成 req.body

app.use(async (req, res, next) => {       // 3. 身分驗證：可能中止這條鏈
  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'login required' }) // 短路
  req.user = user
  next()
})

app.post('/api/orders', async (req, res) => { // 4. handler：全部通過才會執行
  res.status(201).json(await placeOrder(req.user.id, req.body))
})
```

一個既不呼叫 `next()` 也不回應的 middleware，會讓請求一直懸著，這是這種寫法的經典 bug。前兩個 middleware 從不中止請求；第三個用 401 中止，handler 就永遠不會執行。順序很重要：如果身分驗證放在解析 body 之前，它就讀不到放在 body 裡送來的 token。這個範例用的是 Express 5，它會把 `async` middleware 裡丟出的錯誤傳給錯誤處理器。在 Express 4，同樣的錯誤會讓請求懸著，所以每個 async middleware 都需要自己的 `try`/`catch` 來呼叫 `next(err)`。

## 一個 service，三個呼叫者

Service 函式懂商業規則、不懂 HTTP，所以好幾個入口都能呼叫它。

![A route handler, a Server Action and an admin script all call one service](diagram:service-reused-by-multiple-callers)

| 呼叫者 | 誰在用 | 呼叫 service 之前做什麼 |
| --- | --- | --- |
| Route Handler | 手機 App，透過 `POST /api/orders` | 讀取 bearer token、解析 JSON |
| Server Action | 網頁的結帳表單 | 讀取 session cookie、讀取 `FormData` |
| 管理腳本 | 替顧客下單的員工 | 檢查腳本是用員工憑證執行的 |

```ts
// 規則唯一存在的地方
export async function createOrder(userId: string, input: OrderInput) {
  // 檢查庫存、計價、寫入訂單……
}
```

每個呼叫者用自己的方式驗證身分和解析輸入，然後呼叫 `createOrder`。「訂單數量不能超過庫存」這條規則只存在一次。如果它放在 route handler 裡，Server Action 就需要自己的一份複本，而兩份遲早會越差越遠。

## 用 Zod 驗證輸入

Handler 必須把每個請求的 body 都當作不可信的。Zod 只描述一次預期的形狀，在執行時檢查，還免費給你 TypeScript 型別。範例用的是 Zod 4；在 Zod 3 裡，錯誤輔助函式是方法，例如 `parsed.error.flatten()`。

```ts
import { z } from 'zod'

const orderSchema = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) }))
    .min(1),
  note: z.string().max(200).optional(),
})

type OrderInput = z.infer<typeof orderSchema>   // 型別，不需要第二份定義

const parsed = orderSchema.safeParse(await request.json())
if (!parsed.success) {
  // 一個扁平的物件：{ formErrors: [], fieldErrors: { items: ['Too small: ...'] } }
  return Response.json({ errors: z.flattenError(parsed.error) }, { status: 400 })
}
// parsed.data 的型別是 OrderInput，而且已經檢查過了
```

有三個細節值得知道：

- **用 `safeParse`。** `parse` 遇到壞輸入會丟出例外，而沒被處理的例外會變成 500，等於把用戶端的錯誤怪到你的程式頭上。
- **形狀錯誤不是商業錯誤。** 數量 `-3` 是驗證回的 400。「缺貨」是 service 回的 409。見[後端內部](/blog/inside-a-backend)裡的「兩種不合法」。
- **依讀者格式化錯誤。** `z.flattenError` 適合扁平的表單。巢狀資料用 `z.treeifyError`，它會對應 schema 的結構；`z.prettifyError` 則產生適合日誌的易讀字串。

> [!PRINCIPLE] 核心原則
> Middleware 回答「這個請求可以繼續嗎？」，service 回答「規則允許嗎？」，驗證回答「輸入的形狀對嗎？」。讓三者保持分開。
