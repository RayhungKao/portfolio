---
title: "後端內部：請求的生命週期"
---

**你會學到：** 一個請求在後端內部會經過哪五層、每一層負責什麼，以及每一層可以回傳哪個狀態碼。

一個在單一檔案裡長大的後端，最後會變成 SQL 查詢、權限檢查和價格計算全擠在同一個函式裡。常見的解法是把程式切成幾層，讓每一層只做一件事，改動其中一層時不必碰到其他層。

![Five layers a request passes through](diagram:backend-request-lifecycle)

第 2、3、4 層都可以提早中止請求。這正是分層的目的：每一種失敗都只有一個地方負責偵測。

## 一個請求穿過五層

下面是 Next.js Route Handler 裡的 `POST /api/orders`，每一層都用圖中的編號標出來。Next.js 把 `route.ts` 叫做 Route Handler；在這篇文章裡，單獨寫 *handler* 時只指第 3 層，也就是這段程式碼裡處理 HTTP 的部分。

```ts
// 1. 路由：這個檔案的路徑（app/api/orders/route.ts）就是 URL
export async function POST(request: Request) {
  // 2. Middleware，直接寫在這裡：是誰在呼叫？
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'login required' }, { status: 401 })

  // 3. Handler：輸入的形狀對不對？
  const parsed = orderSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'bad input' }, { status: 400 })

  try {
    const order = await createOrder(user.id, parsed.data)
    return Response.json(order, { status: 201 })
  } catch (e) {
    if (e instanceof OutOfStockError) return Response.json({ error: 'sold out' }, { status: 409 })
    throw e // 任何預期外的錯誤都會變成 500
  }
}

// 4. Service：商業規則允許嗎？
async function createOrder(userId: string, input: OrderInput) {
  return prisma.$transaction(async (tx) => {
    await reserveStock(tx, input.items) // 會丟出 OutOfStockError
    // 5. 資料存取：唯一會寫 SQL 或呼叫 ORM 的一層
    return tx.order.create({ data: { userId, items: input.items } })
  })
}
```

Handler 只懂 HTTP，其他一概不管：它讀取 body、檢查形狀，再把錯誤翻譯成狀態碼。Service 只懂商業邏輯，完全不懂 HTTP。它從來看不到 `Request`，所以同一個函式可以從 API route、Server Action 或排程工作呼叫。資料存取層只懂資料庫，不懂規則。

## 兩種「不合法」

驗證（validation）和商業規則看起來很像，但其實是兩個不同的問題。

| 問題 | 層 | 例子 | 狀態碼 |
| --- | --- | --- | --- |
| 資料的形狀正確嗎？ | Handler | `quantity` 是數字、email 裡有 `@`。 | 400 |
| 在目前世界的狀態下允許嗎？ | Service | 商品還有庫存、優惠券還沒過期。 | 409 |

一個請求可以格式完全正確，卻依然是錯的。「購買 2 個 p1 商品」是合法的輸入，但只剩一個時它還是會失敗。

## 401 不是 403

這兩個常常被搞混。**401** 表示伺服器不知道你是誰，所以請登入。**403** 表示它知道你是誰，而答案是不行。未登入的訪客打開 `/admin` 會拿到 401；已登入的顧客打開 `/admin` 會拿到 403。這個差別告訴用戶端下一步該做什麼：401 會把使用者送到登入頁，而 403 則顯示「你沒有權限」——這時若再送他們去登入，就會變成無窮迴圈。

## 最常用到的狀態碼

| 狀態碼 | 意思 | 例子 |
| --- | --- | --- |
| 400 | 輸入格式錯誤。 | 數量是負數。 |
| 401 | 沒有登入。 | Session cookie 過期了。 |
| 403 | 有登入，但不被允許。 | 一般顧客呼叫管理員 endpoint。 |
| 409 | 請求和目前的狀態衝突。 | 最後一件商品剛被買走。 |

再加上 404（找不到）和 500（我們的 bug）就湊齊了，後面談一致性和離線行為的文章也會用到它們。

## Next.js 16 的 middleware

Next.js 16 把 middleware 檔案改名了。截至 2026 年 10 月，`proxy.ts` 取代了已被棄用的 `middleware.ts`（proxy 跑在 Node.js runtime，而不是 edge runtime）。一個專案只有一個 `proxy.ts`，它在路由比對之前執行，很適合當作粗略的第一道關卡：把沒有 session cookie 的人從 `/dashboard` 重新導向出去。但不要把它當成唯一的檢查。Route Handler 和 Server Action 可以透過其他方式被呼叫，所以每一個都還是要自己驗證使用者，就像上面那個寫在函式裡的檢查一樣。

## 什麼時候不需要 service 層

對小型 App 來說，`POST` 函式可以自己做完第 3 到第 5 層的工作：檢查輸入、套用規則、呼叫 ORM。當同一條規則需要在第二個地方使用，或這個函式長到你沒辦法一眼看完時，再加上 service 層。分層是有成本的，等它開始幫你省下東西時再付這筆錢。

有一條規則不管規模大小都成立：永遠不要用使用者輸入拼接字串來組 SQL，SQL injection 就是這樣發生的。把值當作參數傳進去，交給 driver 或 ORM 處理；上面的例子不必額外費力就做到了這點。

> [!PRINCIPLE] 核心原則
> 每一層只做一件事。驗證檢查資料的形狀；商業規則檢查世界的狀態。
