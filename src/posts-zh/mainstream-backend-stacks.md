---
title: "主流後端技術棧：語言、框架與資料庫"
---

**你會學到：** 大多數後端背後的語言家族、使用率數字能說明什麼和不能說明什麼、四個框架怎麼替同樣的層命名，以及怎麼選擇。

一個後端技術棧是四個選擇：語言與 runtime、框架、資料庫，以及在哪裡執行。[伺服器程式在哪裡執行](/blog/running-server-code)談的是最後一個，這篇談前三個。

## 七個家族

| 家族 | 常見框架 | 常見的名聲 |
| --- | --- | --- |
| Node.js / TypeScript | Express、NestJS、Fastify、Next.js route handler | 瀏覽器和伺服器用同一種語言 |
| Java / Kotlin | Spring Boot | 大型、長壽的系統，以及成熟的生態系 |
| Python | Django、FastAPI、Flask | 寫得快，也是資料和 AI 工作的常用語言 |
| C# | ASP.NET Core | 強大的工具，以及 Microsoft 提供的完整平台 |
| Go | 標準函式庫、Gin、Echo | 啟動快、部署成單一檔案的小型服務 |
| Ruby | Rails | 用慣例讓產品快速做出來 |
| PHP | Laravel | 大部分東西都內建的框架 |

就像在 [UI library and framework](/blog/ui-library-and-framework) 裡一樣，這些是名聲，不是定論。[後端框架實務](/blog/backend-frameworks-in-practice)會比較 Node.js 和 Python 的框架，並說明哪些公司使用哪個家族。

## 數字怎麼說

Stack Overflow 2025 開發者調查問了所有受訪者使用哪些網頁框架和技術：Node.js 48.7%、ASP.NET Core 19.7%、FastAPI 14.8%、Spring Boot 14.7%、Flask 14.4%、Django 12.6%、Laravel 8.9%、Rails 5.9%。Express 單獨是 19.9%。

有三點要注意。受訪者是各種開發者，不只是後端開發者。Node.js 是 runtime，卻和框架算在同一張清單裡。而且受訪者可以複選，所以比例加起來不等於總數：你不能把 Django、FastAPI 和 Flask 加起來當作 Python 的數字。這些數字顯示的是什麼常見，而不是什麼最好。

資料庫方面，同一份調查中 PostgreSQL 以 55.6% 排第一，接著是 MySQL 40.5%、SQLite 37.5%、Redis 28%、MongoDB 24%。[資料與儲存](/blog/data-and-storage)說明了為什麼 PostgreSQL 通常是預設選擇。

## 同樣的層，不同的名字

[後端內部](/blog/inside-a-backend)裡的那些層，在每個框架裡都存在，只是名字不同。每一格只列出一種常見的做法，不是唯一的做法。

| 層 | Express（Node.js） | Spring Boot | Django | ASP.NET Core |
| --- | --- | --- | --- | --- |
| Middleware | `app.use(fn)` | Servlet `Filter` 或 `HandlerInterceptor` | `MIDDLEWARE` 設定 | `app.Use(...)` |
| 路由 | `app.get('/orders/:id', handler)` | controller 方法上的 `@GetMapping("/orders/{id}")` | `urls.py` 裡的 `path('orders/<int:id>/', view)` | `app.MapGet("/orders/{id}", ...)` 或 controller |
| 驗證 | Zod 之類的函式庫 | Bean Validation，搭配 `@Valid` | Form，或 Django REST framework 的 serializer | Data annotation，或 FluentValidation 之類的函式庫 |
| 資料庫存取 | Prisma 或 Drizzle 之類的函式庫 | Spring Data JPA | 內建的 Django ORM | Entity Framework Core |
| 背景工作 | BullMQ 之類的 queue 函式庫 | `@Async`、`@Scheduled`，或 message broker | Celery，或 Django 6.0 的 task API 加上你自己跑的 worker | `BackgroundService`，或 Hangfire 之類的函式庫 |

當這個系列的範例是用 Express 寫的時候，就拿這張表來對照：概念是相通的，只有寫法不同。

## 怎麼選擇

- **從團隊已經會的開始。** 熟悉 Spring 的團隊用 Spring 交付，會比用一個得先學的框架更快。
- **看看你能找到什麼人、已經有什麼系統。** 新服務通常要加入既有的系統，和它一致比與眾不同更便宜。
- **兩端同一種語言是真實的便利。** 伺服器也用 TypeScript 時，瀏覽器和後端可以共用型別和驗證規則。
- **純粹的速度很少是決定因素。** 清單上任何一個家族都能應付一般的流量。真正改變結果的是周圍的架構，接下來的文章會談到。

> [!PRINCIPLE] 核心原則
> 選你的團隊跑得動、也找得到人的技術棧。接下來選的架構比語言更重要。
