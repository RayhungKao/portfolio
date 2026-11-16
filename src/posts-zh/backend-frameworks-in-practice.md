---
title: "後端框架實務：每個框架用在哪裡，誰在用"
---

**你會學到：** 常見的 Node.js 和 Python 框架差在哪裡、哪些公司和產品用哪個家族，以及怎麼讓學的東西對上實際的職缺。

[主流後端技術棧](/blog/mainstream-backend-stacks)列了七個語言家族。同一個家族裡的框架也不一樣，主要差在兩件事：框架替你決定了多少，以及它是不是專門為 API 設計的。

## Node.js 框架

| 框架 | 是什麼 | 主要差別 |
| --- | --- | --- |
| Express | 極簡，四個裡面最老的 | 只處理路由和 middleware。驗證、資料庫存取、專案結構都要自己選。教學最多，生態系最大。 |
| Fastify | 比較新的 Express | 一樣輕量，但用 JSON Schema 做驗證和序列化，有 plugin 系統和內建的 logging，速度也更快。 |
| NestJS | 結構固定的框架 | 規定程式要拆成 module、controller 和 service，並使用 decorator 和依賴注入。以 TypeScript 為主，底層跑在 Express 或 Fastify 上。用起來最像 Spring Boot。 |
| Next.js Route Handler | 前端框架的一部分，不是獨立的後端 | 在 `app` 資料夾裡的 `route.ts` 匯出 `GET` 或 `POST` 函式。適合 Next.js 網站需要的那幾個 endpoint，常部署成 serverless function。不適合拿來做大型的獨立後端。 |

## Python 框架

| 框架 | 是什麼 | 主要差別 |
| --- | --- | --- |
| Django | 大部分功能都內建 | 內建 ORM、資料庫 migration、管理後台、登入和表單。適合以資料庫為核心的完整產品。要做 API 的話，通常再加上 Django REST framework。 |
| Flask | 極簡 | 只處理路由和請求。資料庫函式庫（常用 SQLAlchemy）、驗證和其他東西都自己選。適合小型服務和內部工具。 |
| FastAPI | 專門做 API | 從一開始就支援非同步。用 Python 的型別提示搭配 Pydantic 驗證資料，還會自動產生 OpenAPI 文件。沒有 ORM，也沒有管理後台。 |

## 兩種語言，同一條光譜

| 定位 | Node.js | Python |
| --- | --- | --- |
| 極簡：其他的自己組 | Express | Flask |
| 用 schema 或型別做驗證，重視速度 | Fastify | FastAPI |
| 框架替你決定很多事 | NestJS | Django |
| 內建在前端框架裡 | Next.js Route Handler | 沒有對應的 |

NestJS 和 Django 都替你決定很多事，但決定的方向不同：NestJS 規定程式碼的結構，Django 則直接給你現成的功能。

## 誰在用

大公司幾乎都同時用好幾種技術棧。說「X 公司用 Y 框架」，通常指的是某個產品或某幾個服務，不是整間公司都用。

### Python 與 Node.js

| 框架 | 常見需求 | 常見產品 | 例子 |
| --- | --- | --- | --- |
| Django | 以資料庫為核心、功能多、需要管理後台的產品 | 社群和內容平台、票務、SaaS | Instagram 是最大的 Django 網站之一。錯誤追蹤服務 Sentry 是開源的，用 Django 寫成。Eventbrite 曾說自己是流量最大的 Django 網站之一。Django 本身最早是在一家報社 Lawrence Journal-World 開發出來的。 |
| Flask | 小型、自己組裝的網頁層，常是大型工具的一部分 | 資料平台、內部工具、原型 | 開源 BI 工具 Apache Superset 跑在 Flask 上。 |
| FastAPI | 放在機器學習模型前面的 API，或要處理大量同時請求的 API | AI 產品、ML 平台、資料服務 | [FastAPI 網站](https://fastapi.tiangolo.com/)列出的使用者有 Microsoft（ML 服務）、Uber（Ludwig 的預測伺服器）、Netflix（危機管理工具 Dispatch）和 Cisco。Hugging Face 的 Gradio 也是用 FastAPI 寫的。 |
| Express | 前端團隊自己寫後端、輕量的 API，或只服務一個前端的後端 | 電商、新創、網頁後端 | PayPal 在 2013 年把部分服務從 Java 換成 Node.js，它的 Kraken.js 框架就是用 Express 寫的。 |
| Fastify | 想要 Express 的彈性，再加上更快的速度和 schema 驗證 | 高流量 API、microservice | [Fastify 網站](https://fastify.dev/organizations/)列出 Nearform 和 Platformatic 在正式環境使用它，這兩間也是主要開發者所在的公司。 |
| NestJS | 需要統一程式結構的大型團隊，或從 Java、Angular 轉過來的團隊 | 企業系統、金融、零售、製藥 | [NestJS 網站](https://nestjs.com/discover/companies)列出 IBM、Adidas、Sanofi、Mercedes、BMW、GitLab、Decathlon、Roche 和 Société Générale。 |
| Next.js Route Handler | 只需要幾個 endpoint 的 Next.js 網站：表單、webhook、呼叫其他服務 | SaaS 產品、行銷網站、商店前台 | 比較像一種做法，不太算一套技術棧。很少有公司會特別說「我們的後端是 Route Handler」。 |

### 其他家族

| 框架 | 常見產業 | 例子 |
| --- | --- | --- |
| Spring Boot | 銀行、保險、電信、大型電商 | Netflix 在 2018 年把 Spring Boot 定為主要的 Java 框架。銀行和保險公司大量使用。 |
| ASP.NET Core | 企業、政府、遊戲後端、本來就在用 Microsoft 工具的公司 | Stack Overflow 大約在 2020 年從 .NET Framework 換到 .NET Core。Bing 也跑在 .NET 上。 |
| Go | 基礎設施、雲端、要處理大量同時請求的服務 | Uber 有很多服務用 Go 寫。Docker 和 Kubernetes 都是用 Go 寫的。 |
| Rails | 電商平台、SaaS、做第一版產品的新創 | Shopify、GitHub、Basecamp |
| Laravel | 接案公司、中小企業網站、內容網站 | Wikipedia 和 WordPress 都是 PHP 寫的，但都沒用 Laravel。Laravel 比較常見於接案和規模較小的產品。 |

## 依產業來看

- **銀行、保險、電信：** Spring Boot 和 ASP.NET Core。這些產業最在意長期維護、穩定，以及好不好找人。
- **AI 和機器學習產品：** FastAPI。模型本來就是用 Python 寫的，API 也就跟著用 Python。
- **內容和社群平台：** Django 和 Rails。資料模型多，而且一開始就需要管理後台。
- **電商：** Rails（Shopify）、Spring Boot（大型零售商），以及撐起商店前台的 Node.js 後端。
- **雲端和基礎設施：** Go。
- **由前端主導的新創和 SaaS：** Next.js 搭配 Express 或 NestJS，前後端都用 TypeScript。
- **加密貨幣：** 區塊鏈節點和交易所後端用 Go 和 Rust；延遲決定勝負的地方用 C++、Rust 或 Java；跟錢包互動的 App 用 TypeScript；研究和鏈上資料分析用 Python。使用最廣的 Ethereum client Geth 是用 Go 寫的，Solana 則是用 Rust 寫的。Coinbase 一開始用 Rails，後來把大部分後端換成 Go。
- **半導體：** 這個產業的後端大多是工廠內部的系統。追蹤每片晶圓經過哪些製程步驟的製造執行系統（MES），通常用 Java 或 C#。機台整合多用 C# 和 C++，因為很多機台通訊協定 SECS/GEM 的函式庫是給 .NET 或 C++ 用的。良率分析和用機器學習做的缺陷偵測則用 Python。晶片設計又是另一個領域：用的是搭配設計工具的 C++、Python 和 Tcl 腳本，不是網頁框架。

Rust 沒有列在[主流後端技術棧](/blog/mainstream-backend-stacks)的七個家族裡，因為一般的網頁後端還很少用它。但在加密貨幣領域，它是主要語言之一。

可以發現，決定這些選擇的主要是三件事：要做什麼樣的工作、團隊是誰，以及已經有哪些系統。同一個產業裡，節點、交易、App 可能就要用三種不同的技術棧。

## 技術棧會換

上面這些例子都只是某個時間點的狀況。公司的需求變了，就會換技術棧。

- **PayPal** 把服務從 Java 換成 Node.js，讓同一批工程師能同時寫瀏覽器和伺服器的程式。
- **Netflix** 在 2010 年代初期自己做了一套 Java 函式庫，等 Spring 的生態系追上來之後，才改用 Spring Boot。
- **Apache Airflow** 原本的網頁介面是用 Flask 做的，到了 Airflow 3 改成用 FastAPI 做的 API 伺服器。
- **Eventbrite** 是靠 Django 長大的，但從它的職缺描述看得出來，它正在把部分功能拆成用其他技術寫的獨立服務。

原因跟[怎麼選擇](/blog/mainstream-backend-stacks#怎麼選擇)講的一樣：團隊裡有哪些人、系統現在需要什麼，以及怎麼跑比較省錢。

## 對上實際的工作

框架是為了完成某種工作而存在的工具。要學，就學對你有用的那一個：

1. **從你想做的工作開始。** 找十則你想應徵的職位、地點的職缺，看看裡面提到哪些框架。
2. **把一直出現的那一個學深。** 一個能拿來做出產品的框架，勝過五個只碰過的。
3. **學的是那幾層，不只是名字。** [同樣的層，不同的名字](/blog/mainstream-backend-stacks#同樣的層不同的名字)說明了 middleware、路由、驗證、資料庫存取和 background job 每個框架都有。在一個框架裡弄懂了，換到下一個框架，大多只是換個寫法。
4. **做公司真的會做的東西。** 用 Django 做一個管理後台、用 FastAPI 在模型前面包一層 API，或用 NestJS 做一個結構清楚的服務，學到的會比做待辦清單多。

> [!PRINCIPLE] 核心原則
> 公司是依團隊、產品和既有系統來選框架的。學你想應徵的職缺在用的那一個，也把底下那幾層學懂，之後換框架才不用從頭來。
