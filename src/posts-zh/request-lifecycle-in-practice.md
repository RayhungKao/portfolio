---
title: "請求生命週期實務：middleware、共用的 service 與驗證"
---

**你會學到：** middleware 串起來之後怎麼在中途擋下請求、一個 service 怎麼讓好幾個入口共用，以及怎麼用 Zod 驗證輸入。

[後端內部](/blog/inside-a-backend)帶著一個請求走過了五層，這篇把其中三個細節拉近來看。

## Middleware 是一串可以中途擋下的關卡

Middleware 是在 handler 之前先看到請求的函式。好幾個 middleware 串在一起，每一個要嘛把請求交給下一個，要嘛自己直接回應。

![A request through logging, body parsing and authentication, stopped by a 401](diagram:middleware-chain-with-short-circuit)

在 Express 裡，這一串就是好幾次 `app.use`，寫的順序就是執行的順序：

```ts
import express from 'express'

const app = express()

app.use((req, _res, next) => {            // 1. 記錄：一律往下交
  console.log(req.method, req.path)
  next()
})

app.use(express.json())                   // 2. 解析 body：把 JSON 文字轉成 req.body

app.use(async (req, res, next) => {       // 3. 確認身分：可能在這裡擋下
  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'login required' }) // 直接回應，不往下交
  req.user = user
  next()
})

app.post('/api/orders', async (req, res) => { // 4. handler：前面全部通過才會執行
  res.status(201).json(await placeOrder(req.user.id, req.body))
})
```

如果一個 middleware 既沒有呼叫 `next()`，也沒有回應，請求就會一直卡在那裡，這是這種寫法最常見的 bug。前兩個 middleware 從來不會擋下請求；第三個會用 401 擋下，這時 handler 就不會執行。順序也很重要：如果確認身分放在解析 body 之前，它就讀不到放在 body 裡的 token。這個範例用的是 Express 5，`async` middleware 丟出的錯誤會自動交給錯誤處理的 middleware。如果是 Express 4，同樣的錯誤會讓請求卡住，所以每個 async middleware 都要自己寫 `try`/`catch`，再呼叫 `next(err)`。

## 一個 service，三個呼叫者

Service 函式只管商業規則，不碰 HTTP，所以好幾個入口都能呼叫它。

![A Route Handler, a Server Action and an admin script all call one service](diagram:service-reused-by-multiple-callers)

| 呼叫者 | 誰在用 | 呼叫 service 之前先做什麼 |
| --- | --- | --- |
| Route Handler | 手機 App，透過 `POST /api/orders` | 讀 bearer token、解析 JSON |
| Server Action | 網頁上的結帳表單 | 讀 session cookie、讀 `FormData` |
| 管理用的腳本 | 幫顧客下單的員工 | 確認腳本是用員工的憑證執行的 |

```ts
// 規則只寫在這裡
export async function createOrder(userId: string, input: OrderInput) {
  // 檢查庫存、計算金額、寫入訂單……
}
```

每個呼叫者用自己的方式確認身分、解析輸入，然後都去呼叫 `createOrder`。「訂購數量不能超過庫存」這條規則只寫在一個地方。如果它寫在 Route Handler 裡，Server Action 就得自己再寫一份，兩份遲早會越改越不一樣。

## 用 Zod 驗證輸入

Handler 必須把每個請求的 body 都當成不可信任的。Zod 讓你只描述一次資料應該長什麼樣子，執行時會幫你檢查，還順便產生 TypeScript 型別。範例用的是 Zod 4；如果是 Zod 3，處理錯誤的輔助函式是寫成方法，例如 `parsed.error.flatten()`。

```ts
import { z } from 'zod'

const orderSchema = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) }))
    .min(1),
  note: z.string().max(200).optional(),
})

type OrderInput = z.infer<typeof orderSchema>   // 直接產生型別，不用再定義一次

const parsed = orderSchema.safeParse(await request.json())
if (!parsed.success) {
  // 一個扁平的物件：{ formErrors: [], fieldErrors: { items: ['Too small: ...'] } }
  return Response.json({ errors: z.flattenError(parsed.error) }, { status: 400 })
}
// parsed.data 的型別是 OrderInput，而且已經檢查過了
```

有三個細節要知道：

- **用 `safeParse`。** `parse` 遇到不合法的輸入會丟出例外，沒接住的例外會變成 500，等於把 client 的錯算到你的程式頭上。
- **格式錯誤和商業規則的錯誤不一樣。** 數量填 `-3`，是驗證時就回 400；「缺貨」則是 service 回的 409。請見[後端內部](/blog/inside-a-backend)的「兩種不合法」。
- **依照看的人來整理錯誤訊息。** 表單是扁平的，用 `z.flattenError`；資料有巢狀結構的話，用 `z.treeifyError`，它會照 schema 的結構整理；要寫進日誌，用 `z.prettifyError` 產生好讀的字串。

> [!PRINCIPLE] 核心原則
> Middleware 判斷「這個請求能不能繼續」，service 判斷「規則允不允許」，驗證判斷「輸入的格式對不對」。這三件事要分開。
