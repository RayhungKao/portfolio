---
title: "後端內部：請求的生命週期"
---

**你會學到：** 一個請求進到後端後會經過哪五層、每一層負責什麼，以及每一層可能回傳哪些狀態碼。

一個後端如果所有東西都寫在同一個檔案裡，最後常常變成 SQL 查詢、權限檢查和價格計算全部擠在同一個函式裡。常見的做法是把程式分成幾層，每一層只做一件事，改其中一層時不會動到其他層。

![Five layers a request passes through](diagram:backend-request-lifecycle)

第 2、3、4 層都可以在中途把請求擋下來。這就是分層的目的：每一種錯誤都只在一個地方被發現。

## 一個請求經過五層

下面是用 Next.js Route Handler 寫的 `POST /api/orders`，每一層都標上圖裡的編號。Next.js 把 `route.ts` 叫做 Route Handler；這篇文章單獨講 *handler* 時，只指第 3 層，也就是這段程式碼裡處理 HTTP 的部分。

```ts
// 1. 路由：這個檔案的路徑（app/api/orders/route.ts）就是 URL
export async function POST(request: Request) {
  // 2. Middleware，直接寫在這裡：是誰在呼叫？
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'login required' }, { status: 401 })

  // 3. Handler：輸入的格式對不對？
  const parsed = orderSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'bad input' }, { status: 400 })

  try {
    const order = await createOrder(user.id, parsed.data)
    return Response.json(order, { status: 201 })
  } catch (e) {
    if (e instanceof OutOfStockError) return Response.json({ error: 'sold out' }, { status: 409 })
    throw e // 其他沒預料到的錯誤都會變成 500
  }
}

// 4. Service：商業規則允不允許？
async function createOrder(userId: string, input: OrderInput) {
  return prisma.$transaction(async (tx) => {
    await reserveStock(tx, input.items) // 庫存不夠會丟出 OutOfStockError
    // 5. 資料存取：只有這一層會寫 SQL 或呼叫 ORM
    return tx.order.create({ data: { userId, items: input.items } })
  })
}
```

Handler 只管 HTTP：讀 body、檢查格式、把錯誤轉成狀態碼。Service 只管商業邏輯，完全不碰 HTTP。它從頭到尾看不到 `Request`，所以同一個函式可以給 API route、Server Action 或排程工作呼叫。資料存取層只管資料庫，不管規則。

## 兩種「不合法」

驗證（validation）和商業規則看起來很像，但其實在問不同的問題。

| 問題 | 哪一層 | 例子 | 狀態碼 |
| --- | --- | --- | --- |
| 資料格式對嗎？ | Handler | `quantity` 是數字、email 裡有 `@`。 | 400 |
| 以現在的狀況，允許這樣做嗎？ | Service | 商品還有庫存、優惠券還沒過期。 | 409 |

一個請求的格式可以完全正確，結果還是不行。「買 2 個 p1」是合法的輸入，但如果只剩一個，還是會失敗。

## 401 不是 403

這兩個常被搞混。**401** 是伺服器不知道你是誰，請你先登入。**403** 是伺服器知道你是誰，但答案是不行。沒登入的訪客打開 `/admin`，會拿到 401；已經登入的一般顧客打開 `/admin`，會拿到 403。兩者的差別決定 client 接下來該怎麼做：401 就把使用者帶去登入頁，403 則顯示「你沒有權限」。如果遇到 403 還把人送去登入，就會繞成一個無限迴圈。

## 最常用的狀態碼

| 狀態碼 | 意思 | 例子 |
| --- | --- | --- |
| 400 | 輸入格式錯誤。 | 數量是負數。 |
| 401 | 沒有登入。 | Session cookie 過期了。 |
| 403 | 有登入，但沒有權限。 | 一般顧客呼叫管理員才能用的 endpoint。 |
| 409 | 請求跟目前的狀態衝突。 | 最後一件商品剛被別人買走。 |

再加上 404（找不到）和 500（我們自己的 bug）就差不多齊了，後面講一致性和離線行為的文章也會用到。

## Next.js 16 的 middleware

Next.js 16 把 middleware 的檔名改了。截至 2026 年 10 月，`proxy.ts` 取代了已經 deprecated 的 `middleware.ts`（proxy 跑在 Node.js runtime，不是 edge runtime）。一個專案只有一個 `proxy.ts`，它在路由比對之前執行，很適合當第一道粗略的關卡：例如把沒有 session cookie 的人從 `/dashboard` redirect 出去。但不要只靠它檢查。Route Handler 和 Server Action 都可能被繞過它直接呼叫，所以每一個都還是要自己確認使用者身分，就像上面那段程式碼裡寫的檢查一樣。

## 什麼時候不需要 service 層

小型 App 的話，`POST` 函式可以自己包辦第 3 到第 5 層：檢查輸入、套用規則、呼叫 ORM。等到同一條規則要在第二個地方用，或這個函式長到沒辦法一眼看完，再把 service 層拆出來。分層是有成本的，等它開始替你省事時再拆也不遲。

不管規模多小，有一條規則一定要守：永遠不要把使用者的輸入直接拼進 SQL 字串裡，SQL injection 就是這樣來的。把值當成參數傳進去，交給 driver 或 ORM 處理；上面的範例本來就是這樣寫的，不用多做什麼。

> [!PRINCIPLE] 核心原則
> 每一層只做一件事。驗證檢查的是資料的格式，商業規則檢查的是現在的狀況。
