---
title: "伺服器程式在哪裡執行：VPS、容器、PaaS 與 serverless"
---

**你會學到：** VPS、容器平台、PaaS 和 serverless 各自是什麼、什麼時候選 VPS 划算、為什麼用容器、每一種由誰管理什麼，以及真實專案怎麼混搭它們。

靜態檔案只需要一個主機。每次請求都要執行的程式則需要一個 **runtime（執行環境）**：一個啟動你的程式、維持它健康、並給它一個網路位址的地方。取得它有四種常見方式，外加一種大多數方式都能搭配的打包格式。

## 有哪些選項

| 選項 | 是什麼 | 例子 |
| --- | --- | --- |
| VPS | 租來的一台虛擬 Linux 機器。所有東西都由你安裝和執行。 | AWS EC2、Google Compute Engine、DigitalOcean Droplets、Hetzner Cloud、Akamai Cloud（前身是 Linode） |
| 容器 | 把你的 App 和它的依賴打包成一個映像檔，在哪裡都能以同樣的方式執行。它是打包格式，不是主機：容器還是得在某個地方執行。 | 一份 Dockerfile，在 VPS 或平台上執行 |
| 容器平台 | 一個執行你的容器映像檔、並負責重啟或增加副本的服務。你從來不用登入任何一台機器。 | Google Cloud Run、AWS ECS on Fargate、Azure Container Apps；較大的團隊會用 EKS、GKE、AKS 這類 Kubernetes 服務 |
| PaaS | 從一次 Git push 或一個映像檔建置並執行你的 App，並處理重啟和 HTTPS 的平台。 | Render、Railway、Fly.io、AWS Elastic Beanstalk、Azure App Service |
| Serverless | 由平台在每次請求時啟動、之後停止的小型 function，依執行次數計費。 | AWS Lambda、Vercel Functions、Cloudflare Workers、Google Cloud Run functions、Azure Functions |

## 它們都在雲端上

這四種通常都是向雲端供應商租的。差別在於你看得到機器的多少：VPS 給你整個作業系統，serverless 只讓你看到自己的 function。大型雲端供應商每一種都有提供：

| 供應商 | VPS | 容器平台 | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| AWS | EC2 | ECS on Fargate | Elastic Beanstalk | Lambda |
| Google Cloud | Compute Engine | Cloud Run | App Engine（Google 建議新用戶改用 Cloud Run） | Cloud Run functions |
| Azure | Virtual Machines | Container Apps | App Service | Functions |

放在辦公室、或放在你租用機櫃的資料中心裡、屬於你自己的實體伺服器，叫做 **on-premises（地端）**。新的網頁 App 很少這樣做，通常是機器必須放在特定地點或特定網路裡時才會選。

一份小型 Node API 的 Dockerfile 能說明「打包」是什麼意思：

```dockerfile
FROM node:22-slim          # 從一個已經有 Node 的映像檔開始
WORKDIR /app               # 在 /app 裡工作
COPY package*.json ./      # 先複製依賴清單，讓下一步可以被快取
RUN npm ci --omit=dev      # 在建置映像檔時安裝一次依賴
COPY . .                   # 然後複製原始碼
CMD ["node", "server.js"]  # 容器啟動時要執行的指令
```

## 什麼時候選 VPS 划算

VPS 是規則最少的選項：你拿到一台 Linux 機器，其他都由你決定。值不值得，取決於流量、工作的種類，以及誰來照顧這台機器。它不會在每個面向都是最好的選擇。

### 成本取決於流量

拿一支小型 API 來算：每個請求執行 100 ms、使用 512 MB 記憶體。下面是它每月在 AWS Lambda（x86、美東、透過 function URL 呼叫）和 DigitalOcean Droplet 上的費用，價格是 2026 年 11 月查的官方定價：

| 平均流量 | 每月請求數 | AWS Lambda | Droplet，1 vCPU／1 GiB |
| --- | --- | --- | --- |
| 每秒 0.1 個 | 26 萬 | $0（在免費額度內） | $6 |
| 每秒 1 個 | 260 萬 | $0.32 | $6 |
| 每秒 5 個 | 1,300 萬 | $6.53 | $6 |
| 每秒 10 個 | 2,600 萬 | $19.92 | $6 |
| 每秒 50 個 | 1.3 億 | $127 | $6 到 $18，前提是一台機器撐得住 |

Lambda 每百萬個請求收 $0.20，每 GB-秒收 $0.0000166667，每月有一百萬個請求和 40 萬 GB-秒的免費額度。Droplet 不管流量多少都是同一個價錢：1 vCPU、1 GiB 每月 $6，含 1,000 GiB 的對外流量。

以這支 API 來說，兩者在**整個月平均每秒約 5 個請求**時打平。低於這個量，serverless 比較便宜，side project 幾乎免費；高於這個量，固定價格的機器勝出，而且流量越大差距越大。這張表沒算兩件可能改變結論的事：資料傳輸（Lambda 以 EC2 的費率計費，Droplet 在額度內免費），以及你自己的時間，後面兩節會談到。

### 情境

| 情境 | 流量 | 通常比較適合 | 為什麼 |
| --- | --- | --- | --- |
| Side project 或內部工具 | 一天幾百個請求 | Serverless，或 PaaS 的免費方案 | 遠在免費額度內；VPS 閒著也要付錢 |
| 全天流量穩定的 API | 全天候每秒 10 個請求 | VPS，或常駐一份副本的容器平台 | Lambda 每月約 $20，Droplet 是 $6，而且差距會越來越大 |
| 用 WebSocket 的聊天或即時儀表板 | 上千條連線開著好幾小時 | VPS 或容器平台 | Serverless 的 WebSocket 會在時間上限到時關閉（Vercel Functions：300 到 800 秒；AWS API Gateway：2 小時），所以要開好幾小時的連線比較適合伺服器 |
| 搶票或產品發表 | 10 分鐘內每秒 2,000 個請求，之後幾乎沒有 | Serverless，或能自動擴展的容器平台 | VPS 必須照尖峰來配，其餘時間都閒著；Lambda 預設 1,000 個併發執行的上限，足以應付這個尖峰需要的 200 個 |
| 沒有人管伺服器的團隊 | 任何流量 | PaaS 或 serverless | 修補、憑證和備份都需要有人負責，沒人修補的 VPS 才是風險 |

### 五個面向

| | VPS | Serverless（AWS Lambda） |
| --- | --- | --- |
| 成本 | 每月固定；流量穩定後最便宜 | 依請求數和 GB-秒計費；流量低或起伏大時最便宜 |
| 擴展 | 手動。Droplet 要升級規格得先關機，每 GB 已用磁碟大約停機一分鐘，而且磁碟不能縮回去。要加機器就得加負載平衡器 | 自動，預設每個 Region 最多 1,000 個併發執行；每個 function 每 10 秒可以增加 1,000 個 |
| 維護 | 你要修補作業系統、更新憑證、備份、重啟當掉的行程、留意磁碟空間 | AWS 預設會自動套用 runtime 的安全更新；你只維護自己的程式和依賴套件 |
| 安全 | 作業系統、修補和防火牆都歸你。AWS 的責任分擔模型對 EC2 就是把這幾項劃給客戶 | 沒有作業系統或 SSH 要你顧；你負責的是權限、機密和自己的程式 |
| 控制權 | 完全：任何行程、任何 port、任何軟體、長時間的連線 | 在平台的限制內：每次執行有時間上限、連線會在上限到時關閉、請求之間沒有狀態 |

所以，VPS 划算的條件是：流量穩定到超過打平點、工作需要長時間執行的行程或保持開著的連線，而且有人負責修補。少了其中任何一項，把你的時間算進去之後，託管的選項通常比較便宜。

## 為什麼用容器

容器解決的是另一個問題：「在我的電腦上可以跑啊」。映像檔裡帶著確切的 runtime、系統函式庫和依賴，所以同樣的東西在你的筆電、CI 和正式環境上都一樣執行。

- **到處都是同一個映像檔。** 通過測試的那個建置，就是上線的那個建置。少了某個系統函式庫，會在建置映像檔時就發現，而不是部署之後。
- **一台機器跑好幾個服務，彼此隔開。** API、worker 和 Redis 可以共用一台 VPS，各自在自己的容器裡，各用各的版本。指令在 [Docker](/blog/docker-basics) 那篇。
- **容易搬家。** 裝了 Docker 的 VPS、容器平台和大多數 PaaS 都接受同一個映像檔。換供應商只要讓新的主機指向這個映像檔，不必重寫整套設定。
- **擴展就是多跑幾份。** 流量變大時，容器平台會多加幾份映像檔的副本，流量降下來就移除。Google Cloud Run 甚至能在沒人使用時縮到零。

容器本身不是主機。你還是要選它在哪裡跑：在你管理的 VPS 上，或在替你管理機器的容器平台上。

## 誰管理什麼

![Who manages what on a VPS, a PaaS and serverless](diagram:vps-paas-serverless-responsibility)

從 VPS 往 serverless 移動，你交出去的越來越多：先是作業系統和重啟，然後是機器和擴展。代價是控制權變少，還有一些限制，例如每次執行的時間上限，以及請求之間沒有記憶。容器平台和 PaaS 很接近：你提供映像檔，或交出原始碼讓它建成映像檔，平台負責執行機器。大多數 PaaS 也接受映像檔，所以兩者的界線很模糊。

## 怎麼選

| | VPS | 容器平台 | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| 最適合 | 你想要控制權，或固定的低成本 | 你已經有映像檔，想讓平台替你執行和擴展 | 你想推了程式碼就不用再想機器的事 | 流量起伏很大，而且後端很小 |
| 你要處理 | 作業系統修補、TLS、重啟、擴展 | 映像檔、每份副本的 CPU 和記憶體、要跑幾份 | 選方案；其他沒什麼 | Function 大小、時間限制、冷啟動 |
| 小心 | 除了你沒有人值班 | 要學的概念比較多（service、task、revision） | 每多一個服務成本就增加 | 請求之間的狀態；一大堆小 function 很難追 |
| 例子 | 放在 Hetzner VPS 上的 side project，用 Docker Compose 把 App、PostgreSQL 和 Redis 放在同一台 | 放在 Cloud Run 上的 API 映像檔，晚上縮到零 | 放在 Render 上的 Rails App，加一個 worker 和一個 cron job | 放在 AWS Lambda 上、一天只跑幾次的 Stripe webhook |

## 真實專案會混搭

一個用 **Render** 的專案，可能跑一個 API（web service）、一個處理慢工作的背景 worker，以及一個做排程工作的 cron job——同一個平台上三個行程。一個用 **Vercel** 的專案，可能在那裡提供前端，並在旁邊加幾個 API function。較大的公司可能把主要 API 放在容器平台、排程報表做成 serverless function、舊系統留在虛擬機上。沒有哪個比較好；它們適合不同的後端。後端可以有哪些形態、怎麼挑選，在[選擇技術棧](/blog/choosing-the-stack)。

平台的狀態會變，所以決定之前先確認。例如，曾經是預設 PaaS 的 Heroku 在 2026 年 2 月進入維持性工程模式：它繼續運作、繼續修 bug，但不再加新功能，所以新專案通常會找別的平台。

> [!PRINCIPLE] 核心原則
> 伺服器程式需要一個 runtime。從 VPS 到容器平台、PaaS 再到 serverless，是用控制權換取更少需要管理的東西；而一個容器映像檔讓你能在它們之間自由搬家。
