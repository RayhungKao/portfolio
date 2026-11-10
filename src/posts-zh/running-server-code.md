---
title: "伺服器程式在哪裡執行：VPS、容器、PaaS 與 serverless"
---

**你會學到：** VPS、容器平台、PaaS 和 serverless 各自是什麼、怎麼用兩個步驟做選擇（先選形態，再選供應商）、每一種由誰管理什麼，以及真實專案怎麼混搭它們。

靜態檔案只需要一個主機。每次請求都要執行的程式則需要一個 **runtime（執行環境）**：一個啟動你的程式、維持它健康、並給它一個網路位址的地方。取得它有四種常見方式，外加一種大多數方式都能搭配的打包格式。

## 有哪些選項

| 選項 | 是什麼 | 例子 |
| --- | --- | --- |
| VPS | 租來的一台虛擬 Linux 機器。所有東西都由你安裝和執行。 | EC2（AWS）、Compute Engine（Google）、DigitalOcean Droplets、Hetzner Cloud、Akamai Cloud（前身是 Linode） |
| 容器 | 把你的 App 和它的依賴打包成一個映像檔，在哪裡都能以同樣的方式執行。它是打包格式，不是主機：容器還是得在某個地方執行。 | 一份 Dockerfile，在 VPS 或平台上執行 |
| 容器平台 | 一個執行你的容器映像檔、並負責重啟或增加副本的服務。你從來不用登入任何一台機器。 | Cloud Run（Google）、ECS on Fargate（AWS）、Container Apps（Azure）；較大的團隊會用 EKS（AWS）、GKE（Google）、AKS（Azure）這類 Kubernetes 服務 |
| PaaS | 從一次 Git push 或一個映像檔建置並執行你的 App，並處理重啟和 HTTPS 的平台。 | Render、Railway、Fly.io、Elastic Beanstalk（AWS）、App Service（Azure） |
| Serverless | 由平台在每次請求時啟動、之後停止的小型 function，依執行次數計費。 | Lambda（AWS）、Cloud Run functions（Google）、Functions（Azure）、Vercel Functions、Cloudflare Workers |

## 它們都在雲端上

這四種通常都是向雲端供應商租的。差別在於你看得到機器的多少：VPS 給你整個作業系統，serverless 只讓你看到自己的 function。大型雲端供應商每一種都有提供：

| 供應商 | VPS | 容器平台 | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| AWS | EC2 | ECS on Fargate | Elastic Beanstalk | Lambda |
| Google Cloud | Compute Engine | Cloud Run | App Engine（Google 建議新用戶改用 Cloud Run） | Cloud Run functions |
| Azure | Virtual Machines | Container Apps | App Service | Functions |

放在辦公室、或放在你租用機櫃的資料中心裡、屬於你自己的實體伺服器，叫做 **on-premises（地端）**。新的網頁 App 很少這樣做，通常是機器必須放在特定地點或特定網路裡時才會選。

## 先選形態，再選供應商

「要放在哪裡跑？」其實藏著兩個獨立的問題。第一個是**形態**：你交出去多少，從一整台機器到單一個 function。第二個是**供應商**：三大雲之一，還是獨立的公司。三大雲每一種形態都有，所以這兩個答案互不影響。

![Where to run a backend: pick the type, then the vendor](diagram:hosting-decision-tree)

### 第一步：選形態

**需求主要是資料、登入和權限？** 那麼 backend-as-a-service（BaaS）可能就夠了，你自己要寫的後端程式很少。需要一些自訂邏輯時，BaaS 平台也能替你執行：Supabase 有 Edge Functions，Firebase（Google）有 Cloud Functions。什麼時候這樣就夠，見[選擇技術棧](/blog/choosing-the-stack)；各家產品的比較，見 [BaaS 平台](/blog/baas-platforms)。

**工作很短，而且流量低或忽高忽低？** 那就用 function（FaaS）。每次執行都有時間上限：Lambda（AWS）最多 15 分鐘，Vercel 的 Hobby 方案 300 秒，Pro 最多 800 秒。有兩個真實案例標出了它的邊界：

- **沒預料到的暴增。** 繪畫社群 App Cara 一週內從 4 萬名使用者成長到 65 萬，它在 Vercel 上的 function 一天被呼叫 5,600 萬次，帳單達到 $98,280（[InfoQ](https://www.infoq.com/news/2024/06/vercel-serverless-scale-expenses)）。Vercel 表示曾經警告過客戶，而客戶沒有設定支出上限。按用量計費會跟著流量一起成長，所以要設預算上限。
- **穩定而大量的工作。** Prime Video 的團隊把一個原本用 Step Functions 加 Lambda 做成的串流監控服務，改寫成一個 monolith，並表示基礎設施成本降低了 90% 以上（[The New Stack](https://thenewstack.io/return-of-the-monolith-amazon-dumps-microservices-for-video-monitoring/)）。這個數字是團隊自己公布的，也有人認為這是一次重新設計，不算放棄 serverless（[Network World](https://www.networkworld.com/article/3697737/6-lessons-from-the-amazon-prime-video-serverless-vs-monolith-flap.html)）。

**想自己管作業系統？** 適合流量穩定、想要固定的月費，而且有人負責修補的情況。成本、情境和你要扛下的事，見[什麼時候選 VPS 划算](/blog/when-a-vps-pays-off)。

**以上都不是？** 那就用**託管的執行環境**：PaaS 或容器平台。兩者實際上重疊的程度，比名字看起來多。Render 可以直接從 Git repository 建置 Node.js、Python、Go 等語言，也接受預先建好的映像檔；Pro 方案還能依 CPU 和記憶體自動擴展。Cloud Run（Google）接受映像檔，或從你的原始碼替你建一個，並依請求數、CPU 和併發量增減副本，閒置時縮到零。要選哪一個，主要看第二步的供應商，而不是名稱。

### 第二步：選供應商

第一步選出的任何形態，都可以來自大型雲端或獨立的公司。有三種需求會指向大型雲端：

- **資料或使用者在台灣。** Render 的區域是 Oregon、Ohio、Virginia、Frankfurt 和新加坡；Railway 是加州、維吉尼亞、阿姆斯特丹和新加坡；Fly.io 在亞洲有東京和新加坡。Google Cloud 有台灣區域（asia-east1），Cloud Run 可以在那裡跑；AWS 在 2025 年 6 月開放台北區域，每個帳號要先手動啟用；Azure 的台灣北部區域還在預覽階段。距離會反映在每一個請求上：2026 年 11 月從台北的一個網路量測，連到 AWS 建立連線，台北約 20 ms、東京約 50 ms、新加坡約 70 ms、美東約 205 ms。Cloudflare 這類 CDN 並不會替 API 消除這個差距：它預設快取圖片、CSS、JavaScript 這類檔案，但不快取 HTML 和 JSON，所以動態請求還是要跑到伺服器所在的地方（見[邊緣層](/blog/edge-layer)）。
- **雲端額度。** 新創計畫提供的額度，能讓前幾個月幾乎免費。AWS Activate 給自籌資金的新創最多 $5,000，由加速器或投資人推薦的最多 $200,000。
- **你自己的私有網路。** VPC（virtual private cloud）是你在雲端裡自己定義的隔離網路：你決定 IP 範圍、子網路，以及哪些東西可以連上網際網路，所以資料庫可以完全沒有公開位址。當系統的其他部分已經在某個 VPC 裡時，你的程式通常也得加入它。這條界線不是絕對的：Render 的 Pro 方案也能透過 AWS PrivateLink 連到你 AWS VPC 裡的資源。

大型雲端要求你付出一件事：要有人能設定它的網路和權限（IAM）。沒有這樣的人，獨立供應商通常是比較省事的路。合規認證本身不是分界：Render 列出 SOC 2 Type 2、ISO 27001 和 HIPAA，Railway 有 SOC 2 Type II，也能簽署 HIPAA 協議。

## 為什麼用容器

容器解決的是另一個問題：「在我的電腦上可以跑啊」。映像檔裡帶著確切的 runtime、系統函式庫和依賴，所以同樣的東西在你的筆電、CI 和正式環境上都一樣執行。

- **到處都是同一個映像檔。** 通過測試的那個建置，就是上線的那個建置。少了某個系統函式庫，會在建置映像檔時就發現，而不是部署之後。
- **一台機器跑好幾個服務，彼此隔開。** API、worker 和 Redis 可以共用一台 VPS，各自在自己的容器裡，各用各的版本。
- **容易搬家。** 裝了 Docker 的 VPS、容器平台和大多數 PaaS 都接受同一個映像檔。換供應商只要讓新的主機指向這個映像檔，不必重寫整套設定。

容器本身不是主機：你還是要選它在哪裡跑。指令，以及 Docker、Compose 和 Kubernetes 的關係，在 [Docker](/blog/docker-basics) 那篇。

一份小型 Node API 的 Dockerfile 能說明「打包」是什麼意思：

```dockerfile
FROM node:22-slim          # 從一個已經有 Node 的映像檔開始
WORKDIR /app               # 在 /app 裡工作
COPY package*.json ./      # 先複製依賴清單，讓下一步可以被快取
RUN npm ci --omit=dev      # 在建置映像檔時安裝一次依賴
COPY . .                   # 然後複製原始碼
CMD ["node", "server.js"]  # 容器啟動時要執行的指令
```

## 誰管理什麼

![Who manages what on a VPS, a PaaS and serverless](diagram:vps-paas-serverless-responsibility)

從 VPS 往 serverless 移動，你交出去的越來越多：先是作業系統和重啟，然後是機器和擴展。代價是控制權變少，還有一些限制，例如每次執行的時間上限，以及請求之間沒有記憶。容器平台和 PaaS 很接近：你提供映像檔，或交出原始碼讓它建成映像檔，平台負責執行機器。

| | VPS | 容器平台 | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| 你要處理 | 作業系統修補、TLS、重啟、擴展 | 映像檔、每份副本的 CPU 和記憶體、要跑幾份 | 選方案；其他沒什麼 | Function 大小、時間限制、冷啟動 |
| 小心 | 除了你沒有人值班 | 要學的概念比較多（service、task、revision） | 每多一個服務成本就增加 | 請求之間的狀態；一大堆小 function 很難追 |
| 例子 | 放在 Hetzner VPS 上的 side project，用 Docker Compose 把 App、PostgreSQL 和 Redis 放在同一台 | 放在 Cloud Run（Google）上的 API 映像檔，晚上縮到零 | 放在 Render 上的 Rails App，加一個 worker 和一個 cron job | 放在 Lambda（AWS）上、一天只跑幾次的 Stripe webhook |

## 真實專案會混搭

一個用 **Render** 的專案，可能跑一個 API（web service）、一個處理慢工作的背景 worker，以及一個做排程工作的 cron job——同一個平台上三個行程。一個用 **Vercel** 的專案，可能在那裡提供前端，並在旁邊加幾個 API function。較大的公司可能把主要 API 放在容器平台、排程報表做成 serverless function、舊系統留在虛擬機上。沒有哪個比較好；它們適合不同的後端。

平台的狀態會變，所以決定之前先確認。例如，曾經是預設 PaaS 的 Heroku 在 2026 年 2 月進入維持性工程模式：它繼續運作、繼續修 bug，但不再加新功能，所以新專案通常會找別的平台。

> [!PRINCIPLE] 核心原則
> 依工作的性質選形態，再依資料必須放在哪裡、手上有沒有額度、必須加入哪個網路來選供應商。伺服器程式需要一個 runtime，而一個容器映像檔讓你能在它們之間自由搬家。
