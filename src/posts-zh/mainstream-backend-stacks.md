---
title: "主流後端技術棧：語言、框架與資料庫"
---

**你會學到：** 大部分後端用的是哪幾個語言家族、使用率數字看得出什麼又看不出什麼、四個框架怎麼稱呼同樣的那幾層、系統拆成 microservice 時有什麼不同，以及該怎麼選。

選一套後端技術棧，其實是做四個決定：語言和 runtime、框架、資料庫，以及程式要跑在哪裡。最後一個在[伺服器程式在哪裡執行](/blog/running-server-code)談過，這篇談前三個。

## 七個家族

| 家族 | 常見框架 | 大家對它的印象 |
| --- | --- | --- |
| Node.js / TypeScript | Express、NestJS、Fastify、Next.js Route Handler | 瀏覽器和伺服器可以用同一種語言 |
| Java / Kotlin | Spring Boot | 適合大型、要長期維護的系統，生態系成熟 |
| Python | Django、FastAPI、Flask | 寫起來快，也是做資料和 AI 最常用的語言 |
| C# | ASP.NET Core | 開發工具好用，Microsoft 提供完整的平台 |
| Go | 標準函式庫、Gin、Echo | 適合啟動快、編譯成單一檔案部署的小型服務 |
| Ruby | Rails | 照著框架的慣例走，產品能很快做出來 |
| PHP | Laravel | 大部分需要的功能框架都內建了 |

跟 [UI library and framework](/blog/ui-library-and-framework) 那篇一樣，這些只是一般印象，不是定論。[後端框架實務](/blog/backend-frameworks-in-practice)會比較 Node.js 和 Python 的各個框架，也會列出哪些公司用哪個家族。

## 數字告訴我們什麼

Stack Overflow 2025 開發者調查問所有受訪者用了哪些網頁框架和技術，結果是：Node.js 48.7%、ASP.NET Core 19.7%、FastAPI 14.8%、Spring Boot 14.7%、Flask 14.4%、Django 12.6%、Laravel 8.9%、Rails 5.9%。Express 自己是 19.9%。

看這些數字要注意三件事。第一，受訪者是各種開發者，不只是寫後端的人。第二，Node.js 是 runtime，卻跟框架放在同一張清單裡比。第三，受訪者可以複選，所以比例不能直接相加：不能把 Django、FastAPI、Flask 加起來，當成 Python 的使用率。這些數字只能看出什麼比較普遍，看不出什麼比較好。

資料庫的部分，同一份調查裡 PostgreSQL 以 55.6% 排第一，接著是 MySQL 40.5%、SQLite 37.5%、Redis 28%、MongoDB 24%。為什麼 PostgreSQL 常常是預設的選擇，請見[資料與儲存](/blog/data-and-storage)。

## 同樣的層，不同的名字

[後端內部](/blog/inside-a-backend)講的那幾層，每個框架裡都有，只是叫法不同。下表每一格只列一種常見的寫法，不代表只能這樣寫。

| 層 | Express（Node.js） | Spring Boot | Django | ASP.NET Core |
| --- | --- | --- | --- | --- |
| Middleware | `app.use(fn)` | Servlet `Filter` 或 `HandlerInterceptor` | `MIDDLEWARE` 設定 | `app.Use(...)` |
| 路由 | `app.get('/orders/:id', handler)` | controller 方法上的 `@GetMapping("/orders/{id}")` | `urls.py` 裡的 `path('orders/<int:id>/', view)` | `app.MapGet("/orders/{id}", ...)` 或 controller |
| 驗證 | Zod 之類的函式庫 | Bean Validation，搭配 `@Valid` | Form，或 Django REST framework 的 serializer | Data annotation，或 FluentValidation 之類的函式庫 |
| 資料庫存取 | Prisma 或 Drizzle 之類的函式庫 | Spring Data JPA | 內建的 Django ORM | Entity Framework Core |
| Background job | BullMQ 之類的 queue 函式庫 | `@Async`、`@Scheduled`，或 message broker | Celery，或 Django 6.0 的 task API 加上你自己跑的 worker | `BackgroundService`，或 Hangfire 之類的函式庫 |

這個系列的範例如果是用 Express 寫的，可以拿這張表對照：觀念都一樣，只是寫法不同。

## 系統拆成好幾個服務時：microservice

上面講的都是只有一個後端的情況。系統變大之後，也可以拆成好幾個 **microservice**：每個服務都是獨立的 process，可以單獨部署，彼此透過網路溝通。現在大家對 microservice 的理解，多半來自 James Lewis 和 Martin Fowler 2014 年的文章。文中有兩點跟選技術棧直接相關：

- **每個服務可以自己選技術棧。** 他們舉的例子是用 Node.js 做一個簡單的報表頁，用 C++ 做一個即時性要求很高的元件。不過他們也說，可以這樣做不代表應該這樣做，拆開只是讓你多了這個選擇。
- **每個服務擁有自己的資料。** 他們建議每個服務管理自己的資料庫。其他服務不能直接讀這些 table，要資料就得呼叫這個服務的 API。

所以混用好幾種技術棧是可以選的，但不是非這樣不可。

### 一定要有一個主要的 API server 嗎？

不一定。client 可以直接呼叫各個服務，也可以全部從同一個入口進來。Microsoft 的 microservice 架構指南比較過這幾種做法：

| 形態 | client 怎麼找到服務 | 適合的情況 |
| --- | --- | --- |
| 直接呼叫 | 每個服務都有自己的公開 endpoint | 小型系統，特別是 client 是伺服器端的網頁 App 時 |
| API gateway | 一個入口把每個請求轉給對應的服務、檢查憑證，也可以把好幾個服務的結果合成一個回應 | 手機 App 和 single-page app、服務很多時 |
| Backend for frontend（BFF） | 每一種 client 一個 gateway，例如網頁一個、手機一個 | 一個 gateway 要應付所有 client，越長越大時 |

服務越多，直接呼叫的問題就越明顯。client 得知道系統是怎麼拆的，一旦拆法改了，client 也要跟著改。一個畫面可能要呼叫好幾個服務、來回好幾趟。每個服務都直接暴露在網路上，也都得各自處理授權和 TLS。

Gateway 可以解決這些問題，但也有代價：多一個要開發和維運的元件，每個請求多經過一站，而且它一掛，所有人都受影響。Gateway 只負責轉送請求、檢查憑證、合併回應，商業規則不該放在它裡面。Microsoft 的指南也提醒，如果一個 gateway 要應付所有 client，最後很容易變成另一個 monolith，所以建議依 client 的種類各用一個。[身分驗證實務](/blog/authentication-in-practice)裡的 gateway 就是一個例子：它把各種外部憑證轉成同一種內部 token。

### 先從一個開始

Fowler 建議新專案不要一開始就用 microservice。他觀察到，幾乎所有成功的 microservice 案例，都是先有一個 monolith，等它大到難以維護時才拆開的。什麼時候該拆，見[全端框架，還是獨立的後端](/blog/full-stack-or-separate-backend#什麼時候該拆開)。

## 怎麼選擇

- **先用團隊已經會的。** 熟悉 Spring 的團隊用 Spring 開發，會比換一個要先花時間學的框架快。
- **看看找得到什麼樣的人，以及公司已經有哪些系統。** 新的服務通常要接進既有的系統，跟它用一樣的技術，成本會比較低。
- **前後端用同一種語言，確實方便。** 伺服器也用 TypeScript 的話，瀏覽器和後端可以共用型別和驗證規則。
- **執行速度很少是關鍵。** 表上任何一個家族都應付得了一般的流量。真正影響結果的是整體架構，接下來幾篇會談到。

> [!PRINCIPLE] 核心原則
> 選團隊能維運、也找得到人的技術棧。接下來要選的架構，比語言更重要。
