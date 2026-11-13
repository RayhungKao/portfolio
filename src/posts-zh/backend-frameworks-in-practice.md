---
title: "後端框架實務：每個框架用在哪裡，誰在用"
---

**你會學到：** 主要的 Node.js 和 Python 框架有什麼不同、哪些公司和產品使用哪個家族，以及怎麼把學到的東西連結到現有的職缺。

[主流後端技術棧](/blog/mainstream-backend-stacks)列出了七個語言家族。在同一個家族裡，框架之間仍有差異，主要差在兩點：框架替你決定了多少，以及它是不是主要為 API 打造的。

## Node.js 框架

| 框架 | 是什麼 | 關鍵差異 |
| --- | --- | --- |
| Express | 極簡，四者中最老的 | 處理路由和 middleware。驗證、資料庫存取和專案結構都由你自己選。教學最多、生態系最大。 |
| Fastify | 更現代的 Express | 一樣小，但用 JSON Schema 做驗證和序列化，有 plugin 系統和內建 logging，而且更快。 |
| NestJS | 結構固定的框架 | 決定程式要怎麼拆成 module、controller 和 service，並使用 decorator 和依賴注入。以 TypeScript 為主，跑在 Express 或 Fastify 之上。感覺最接近 Spring Boot。 |
| Next.js Route Handler | 前端框架的一部分，不是獨立的後端 | 從 `app` 資料夾裡的 `route.ts` 匯出 `GET` 或 `POST` 函式。適合 Next.js 網站需要的少數幾個 endpoint，常部署成 serverless function。不是拿來做大型獨立後端的。 |

## Python 框架

| 框架 | 是什麼 | 關鍵差異 |
| --- | --- | --- |
| Django | 大部分東西都內建 | 附有 ORM、資料庫 migration、管理介面、登入和表單。適合圍繞資料庫打造的完整產品。API 通常用 Django REST framework 加上去。 |
| Flask | 極簡 | 處理路由和請求。資料庫函式庫（常用 SQLAlchemy）、驗證和其他東西都由你選。適合小型服務和內部工具。 |
| FastAPI | 為 API 打造 | 從一開始就是非同步的。用 Python 型別提示搭配 Pydantic 驗證資料，並自動產生 OpenAPI 文件。沒有 ORM，也沒有管理介面。 |

## 兩種語言裡的同一道光譜

| 位置 | Node.js | Python |
| --- | --- | --- |
| 極簡：其他的自己組裝 | Express | Flask |
| 由 schema 或型別驅動驗證，並注重速度 | Fastify | FastAPI |
| 框架替你決定很多 | NestJS | Django |
| 內建於前端框架 | Next.js Route Handler | 沒有直接對應的 |

NestJS 和 Django 都替你決定很多，但決定的東西不同。NestJS 決定程式碼的結構，Django 給你現成的功能。

## 誰在用

大公司幾乎都同時使用好幾種技術棧。「X 公司用 Y 框架」通常指的是某個產品或某些服務，而不是整間公司。

### Python 與 Node.js

| 框架 | 典型需求 | 常見產品 | 例子 |
| --- | --- | --- | --- |
| Django | 圍繞資料庫、功能多、需要管理介面的產品 | 社群與內容平台、票務、SaaS | Instagram，最大的 Django 網站之一。錯誤追蹤服務 Sentry 是開源的，建立在 Django 上。Eventbrite 曾形容自己是流量最大的 Django 網站之一。Django 本身誕生於一家報社 Lawrence Journal-World。 |
| Flask | 小型、自己組裝的網頁層，常放在更大的工具裡 | 資料平台、內部工具、原型 | 開源 BI 工具 Apache Superset 跑在 Flask 上。 |
| FastAPI | 放在機器學習模型前面的 API，或高並行的 API | AI 產品、ML 平台、資料服務 | [FastAPI 網站](https://fastapi.tiangolo.com/)引用了 Microsoft（ML 服務）、Uber（Ludwig 的預測伺服器）、Netflix（危機管理工具 Dispatch）和 Cisco。Hugging Face 的 Gradio 建立在 FastAPI 上。 |
| Express | 前端團隊自己寫後端、輕量 API，或服務單一前端的後端 | 電商、新創、網頁後端 | PayPal 在 2013 年把部分服務從 Java 搬到 Node.js，它的 Kraken.js 框架建立在 Express 上。 |
| Fastify | 想要 Express 的彈性，再加上更快的速度和 schema 驗證 | 高流量 API、microservice | [Fastify 網站](https://fastify.dev/organizations/)列出 Nearform 和 Platformatic 是正式環境使用者，也是主要開發者背後的公司。 |
| NestJS | 需要共同結構的大型團隊，或從 Java、Angular 轉過來的團隊 | 企業系統、金融、零售、製藥 | [NestJS 網站](https://nestjs.com/discover/companies)列出 IBM、Adidas、Sanofi、Mercedes、BMW、GitLab、Decathlon、Roche 和 Société Générale。 |
| Next.js Route Handler | 需要幾個 endpoint 的 Next.js 網站：表單、webhook、呼叫其他服務 | SaaS 產品、行銷網站、商店前台 | 比較像一種模式，而不是一個有名字的技術棧。公司很少會宣布「我們的後端是 Route Handler」。 |

### 其他家族

| 框架 | 常見產業 | 例子 |
| --- | --- | --- |
| Spring Boot | 銀行、保險、電信、大型電商 | Netflix 在 2018 年把 Spring Boot 定為核心 Java 框架。銀行和保險公司廣泛使用。 |
| ASP.NET Core | 企業、政府、遊戲後端、已經在用 Microsoft 工具的公司 | Stack Overflow 大約在 2020 年從 .NET Framework 遷移到 .NET Core。Bing 也跑在 .NET 上。 |
| Go | 基礎設施、雲端、高並行服務 | Uber 有很多服務用 Go 寫。Docker 和 Kubernetes 是用 Go 寫的。 |
| Rails | 電商平台、SaaS、做第一版的新創 | Shopify、GitHub、Basecamp |
| Laravel | 接案公司、中小企業網站、內容網站 | PHP 撐起了 Wikipedia 和 WordPress，但兩者都沒有用 Laravel。Laravel 常見於接案工作和較小的產品。 |

## 依產業來看

- **銀行、保險和電信：** Spring Boot 和 ASP.NET Core。長期維護、穩定，以及容易招募最重要。
- **AI 和機器學習產品：** FastAPI。模型本來就是 Python，所以 API 也是。
- **內容和社群平台：** Django 和 Rails。資料模型多，而且第一天就要有管理介面。
- **電商：** Rails（Shopify）、Spring Boot（大型零售商），以及支撐商店前台的 Node.js 後端。
- **雲端和基礎設施：** Go。
- **前端主導的新創和 SaaS：** Next.js 搭配 Express 或 NestJS，兩端都是 TypeScript。
- **加密貨幣：** 區塊鏈節點和交易所後端用 Go 和 Rust；延遲決定勝負的地方用 C++、Rust 或 Java；和錢包互動的 App 周邊用 TypeScript；研究和鏈上資料用 Python。最廣泛使用的 Ethereum 用戶端 Geth 是用 Go 寫的，Solana 則是用 Rust 寫的。Coinbase 從 Rails 起家，後來把大部分後端搬到 Go。
- **半導體：** 這裡的後端大多是工廠自己的系統。追蹤每片晶圓經過每個步驟的製造執行系統（MES）通常是 Java 或 C#。設備整合偏向 C# 和 C++，因為很多設備協定 SECS/GEM 的函式庫以 .NET 或 C++ 為目標。良率分析和用機器學習做的缺陷偵測是 Python。晶片設計又是另一個世界：圍繞設計工具的 C++、Python 和 Tcl 腳本，而不是網頁框架。

Rust 不在[主流後端技術棧](/blog/mainstream-backend-stacks)的七個家族裡，因為它在一般網頁後端仍然少見。但在加密貨幣領域，它是主要語言之一。

注意決定這些選擇的主要因素：工作的種類、團隊，以及已經存在的系統。同一個產業可能為了節點、交易和 App 需要三種不同的技術棧。

## 技術棧會變

上面的例子都是快照。公司的需求改變時，就會換技術棧。

- **PayPal** 把服務從 Java 搬到 Node.js，讓同一批工程師能同時處理瀏覽器和伺服器。
- **Netflix** 在 2010 年代初期自己打造 Java 函式庫，等 Spring 生態系追上之後才轉向 Spring Boot。
- **Apache Airflow** 原本把網頁介面建立在 Flask 上，到 Airflow 3 改成以 FastAPI 為基礎的 API 伺服器。
- **Eventbrite** 在 Django 上成長，它的職缺描述顯示正在轉向使用其他技術的獨立服務。

理由和[怎麼選擇](/blog/mainstream-backend-stacks#怎麼選擇)裡的一樣：團隊裡有誰、系統現在需要什麼，以及什麼跑起來比較便宜。

## 連結到真實的工作

框架是為了某項工作而存在的工具。要學對你重要的那一個：

1. **從你想要的工作開始。** 讀十則你目標職位和地點的職缺，數一數它們提到哪些框架。
2. **深入學那個一直出現的。** 一個你能拿來交付的框架，勝過五個你試過的。
3. **學層，不只是學名字。** [同樣的層，不同的名字](/blog/mainstream-backend-stacks#同樣的層不同的名字)說明了 middleware、路由、驗證、資料庫存取和 background job 到處都有。在一個框架裡懂了它們，下一個框架大多只是換個寫法。
4. **做公司會做的東西。** 用 Django 做管理後台、用 FastAPI 在模型前面做 API，或用 NestJS 做一個結構固定的服務，學到的會比待辦清單多。

> [!PRINCIPLE] 核心原則
> 公司依據團隊、產品和既有系統挑選框架。學你目標職缺用的那個，並學會底下的層，好讓你能轉到下一個。
