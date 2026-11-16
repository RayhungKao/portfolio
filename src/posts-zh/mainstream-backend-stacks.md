---
title: "主流後端技術棧：語言、框架與資料庫"
---

**你會學到：** 大多數後端背後的語言家族、使用率數字能說明什麼和不能說明什麼、四個框架怎麼替同樣的層命名、系統拆成 microservice 時會有什麼不同，以及怎麼選擇。

一個後端技術棧是四個選擇：語言與 runtime、框架、資料庫，以及在哪裡執行。[伺服器程式在哪裡執行](/blog/running-server-code)談的是最後一個，這篇談前三個。

## 七個家族

| 家族 | 常見框架 | 常見的名聲 |
| --- | --- | --- |
| Node.js / TypeScript | Express、NestJS、Fastify、Next.js Route Handler | 瀏覽器和伺服器用同一種語言 |
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
| Background job | BullMQ 之類的 queue 函式庫 | `@Async`、`@Scheduled`，或 message broker | Celery，或 Django 6.0 的 task API 加上你自己跑的 worker | `BackgroundService`，或 Hangfire 之類的函式庫 |

當這個系列的範例是用 Express 寫的時候，就拿這張表來對照：概念是相通的，只有寫法不同。

## 系統拆成好幾個服務時：microservice

上面的內容都假設只有一個後端。比較大的系統也可以拆成 **microservice**：一個個小的服務，各自是獨立的 process、各自部署，彼此透過網路溝通。James Lewis 和 Martin Fowler 在 2014 年的文章替這種風格下了大家常用的描述，其中有兩個結果跟這篇有關。

- **每個服務可以自己選技術棧。** 他們舉的例子是用 Node.js 做一個簡單的報表頁，用 C++ 做一個即時性要求很高的元件。他們也補充：能這樣做，不代表應該這樣做；拆開只是讓你有這個選項。
- **每個服務擁有自己的資料。** 他們傾向讓每個服務管理自己的資料庫。別的服務不直接讀這些 table，而是透過這個服務的 API 來問。

所以混用技術棧是一個選項，不是必要條件。

### 一定要有一個主要的 API server 嗎？

不一定。用戶端可以直接呼叫各個服務，也可以從同一個入口進去。Microsoft 的 microservice 架構指南比較了這兩種做法。

| 形態 | 用戶端怎麼找到服務 | 適合的情況 |
| --- | --- | --- |
| 直接呼叫 | 每個服務都有自己的公開 endpoint | 小型系統，特別是用戶端是伺服器端的網頁 App 時 |
| API gateway | 一個入口把每個請求轉給對應的服務、檢查憑證，也可以把好幾個服務的結果合成一個回應 | 手機 App 和 single-page app、服務很多時 |
| Backend for frontend（BFF） | 每一種用戶端一個 gateway，例如網頁一個、手機一個 | 一個 gateway 服務所有用戶端、變得太大時 |

直接呼叫的代價會隨服務數量增加。用戶端必須知道系統怎麼拆，所以一改拆法，用戶端就跟著壞。一個畫面可能要來回好幾趟。每個服務都暴露在網路上，而且每一個都得自己處理授權和 TLS。

Gateway 解決了這些問題，也帶來自己的代價：多一個要開發和維運的元件、多一跳網路，以及多一個一壞就影響所有人的地方。它的工作是轉送請求、檢查憑證、合併回應，不是商業規則。Microsoft 的指南提醒，一個服務所有用戶端的 gateway 容易長成另一個 monolith，所以建議每一種用戶端各用一個。[身分驗證實務](/blog/authentication-in-practice)裡的 gateway 就是一個例子：它把各種外部憑證轉成同一種內部 token。

### 先從一個開始

Fowler 的建議是不要用 microservice 開始一個新專案。他觀察到，幾乎所有成功的 microservice 案例，都是從一個長得太大、後來被拆開的 monolith 開始的。什麼時候該拆，見[全端框架，還是獨立的後端](/blog/full-stack-or-separate-backend#什麼時候該拆開)。

## 怎麼選擇

- **從團隊已經會的開始。** 熟悉 Spring 的團隊用 Spring 交付，會比用一個得先學的框架更快。
- **看看你能找到什麼人、已經有什麼系統。** 新服務通常要加入既有的系統，和它一致比與眾不同更便宜。
- **兩端同一種語言是真實的便利。** 伺服器也用 TypeScript 時，瀏覽器和後端可以共用型別和驗證規則。
- **純粹的速度很少是決定因素。** 清單上任何一個家族都能應付一般的流量。真正改變結果的是周圍的架構，接下來的文章會談到。

> [!PRINCIPLE] 核心原則
> 選你的團隊跑得動、也找得到人的技術棧。接下來選的架構比語言更重要。
