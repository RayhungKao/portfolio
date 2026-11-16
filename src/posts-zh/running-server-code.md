---
title: "伺服器程式在哪裡執行：VPS、container、PaaS 與 serverless"
---

**你會學到：** VPS、container 平台、PaaS 和 serverless 各是什麼、怎麼分兩步做選擇（先選類型，再選服務商）、每一種哪些事由誰負責，以及實際的專案怎麼混搭它們。

靜態檔案只需要一個地方放。但每次有請求就要執行的程式，需要一個 **runtime**：一個負責啟動你的程式、讓它持續正常運作，並給它一個網路位址的地方。常見的取得方式有四種，另外還有一種大部分方式都能搭配的打包格式。

## 有哪些選擇

| 選擇 | 是什麼 | 例子 |
| --- | --- | --- |
| VPS | 租來的一台虛擬 Linux 機器。所有東西都要自己安裝、自己跑。 | EC2（AWS）、Compute Engine（Google）、DigitalOcean Droplets、Hetzner Cloud、Akamai Cloud（前身是 Linode） |
| Container | 把你的 App 和它需要的所有東西打包成一個 image，放到哪裡都能用同樣的方式執行。它是一種打包格式，不是主機：container 還是要放在某個地方才能跑。 | 一份 Dockerfile，放在 VPS 或平台上執行 |
| Container 平台 | 幫你執行 container image 的服務，掛了會幫你重啟，流量大了會幫你多開幾份。你完全不用登入任何一台機器。 | Cloud Run（Google）、ECS on Fargate（AWS）、Container Apps（Azure）；規模比較大的團隊會用 EKS（AWS）、GKE（Google）、AKS（Azure）這類 Kubernetes 服務 |
| PaaS | 你 push 程式碼到 Git，或交一個 image 給它，它就幫你建置、執行，也會幫你處理重啟和 HTTPS。 | Render、Railway、Fly.io、Elastic Beanstalk（AWS）、App Service（Azure） |
| Serverless | 由平台在每次請求進來時啟動、做完就停掉的小型 function，依執行次數收費。 | Lambda（AWS）、Cloud Run functions（Google）、Functions（Azure）、Vercel Functions、Cloudflare Workers |

## 全都在雲端上

這四種通常都是向雲端服務商租的，差別在於你能碰到機器的多少：VPS 給你整個作業系統，serverless 只讓你管自己的 function。大型雲端服務商每一種都有：

| 服務商 | VPS | Container 平台 | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| AWS | EC2 | ECS on Fargate | Elastic Beanstalk | Lambda |
| Google Cloud | Compute Engine | Cloud Run | App Engine（Google 建議新用戶改用 Cloud Run） | Cloud Run functions |
| Azure | Virtual Machines | Container Apps | App Service | Functions |

放在自己辦公室，或放在租來的機房機櫃裡、屬於你自己的實體伺服器，叫做 **on-premises**（地端）。新的網頁 App 很少這樣做，通常只有機器一定要放在特定地點或特定網路裡時才會選。

## 先選類型，再選服務商

「程式要放在哪裡跑？」其實是兩個獨立的問題。第一個是**類型**：你要交出去多少，從一整台機器到只剩一個 function。第二個是**服務商**：三大雲端之一，還是獨立的公司。三大雲端每種類型都有，所以這兩個問題可以分開回答。

![Where to run a backend: pick the type, then the vendor](diagram:hosting-decision-tree)

### 第一步：選類型

**需求主要是資料、登入和權限？** 那用 backend-as-a-service（BaaS）可能就夠了，你自己要寫的後端程式很少。需要一點自訂邏輯時，BaaS 平台也能幫你跑：Supabase 有 Edge Functions，Firebase（Google）有 Cloud Functions。什麼情況下這樣就夠，請見[選擇技術棧](/blog/choosing-the-stack)；各家產品的比較，請見 [BaaS 平台](/blog/baas-platforms)。

**工作執行時間短，而且流量不大或時高時低？** 那就用 function（FaaS）。每次執行都有時間上限：Lambda（AWS）最多 15 分鐘，Vercel 的 Hobby 方案 300 秒，Pro 方案最多 800 秒。下面兩個真實案例，正好說明它適合和不適合的地方：

- **流量突然暴增。** 繪畫社群 App Cara 在一週內從 4 萬名使用者暴增到 65 萬，它放在 Vercel 上的 function 一天被呼叫 5,600 萬次，帳單衝到 $98,280（[InfoQ](https://www.infoq.com/news/2024/06/vercel-serverless-scale-expenses)）。Vercel 表示事前有發出警告，但客戶沒有設定支出上限。依用量計費的服務，費用會跟著流量一起漲，所以一定要設預算上限。
- **穩定又大量的工作。** Prime Video 的團隊有一個監控串流品質的服務，原本用 Step Functions 加 Lambda 做，後來改寫成一個 monolith，他們表示基礎設施成本降了 90% 以上（[The New Stack](https://thenewstack.io/return-of-the-monolith-amazon-dumps-microservices-for-video-monitoring/)）。這個數字是團隊自己公布的，也有人認為這只是重新設計，不代表放棄 serverless（[Network World](https://www.networkworld.com/article/3697737/6-lessons-from-the-amazon-prime-video-serverless-vs-monolith-flap.html)）。

**想自己管作業系統？** 適合流量穩定、想要固定月費，而且有人負責更新修補的情況。成本怎麼算、適合什麼情境、要自己扛哪些事，請見[什麼時候選 VPS 划算](/blog/when-a-vps-pays-off)。

**上面都不符合？** 那就用 **managed runtime**：PaaS 或 container 平台。這兩種實際上重疊的部分，比名字看起來多。Render 可以直接從 Git repository 建置 Node.js、Python、Go 等語言的程式，也接受已經建好的 image；Pro 方案還能依 CPU 和記憶體自動擴充。Cloud Run（Google）接受 image，也能從你的原始碼幫你建一個，會依請求數、CPU 和同時處理的請求量增減執行的份數，沒有流量時縮到零。兩者要選哪一個，主要看第二步選的服務商，而不是看名稱。

### 第二步：選服務商

第一步選出的任何一種類型，都可以向大型雲端或獨立的公司租。有三種需求會讓你選大型雲端：

- **資料或使用者在台灣。** Render 的機房在 Oregon、Ohio、Virginia、Frankfurt 和新加坡；Railway 在加州、維吉尼亞、阿姆斯特丹和新加坡；Fly.io 在亞洲有東京和新加坡。Google Cloud 有台灣機房（asia-east1），Cloud Run 可以跑在那裡；AWS 在 2025 年 6 月開了台北區域，每個帳號要先手動啟用；Azure 的台灣北部區域還在預覽階段。距離會影響每一個請求：2026 年 11 月從台北的某個網路實測，連到 AWS 建立連線的時間，台北約 20 ms、東京約 50 ms、新加坡約 70 ms、美東約 205 ms。Cloudflare 這類 CDN 也沒辦法替 API 縮短這段距離：它預設只快取圖片、CSS、JavaScript 這類檔案，不快取 HTML 和 JSON，所以動態的請求還是得一路送到伺服器所在的地方（見 [Edge 層](/blog/edge-layer)）。
- **雲端額度。** 新創計畫提供的雲端額度，可以讓前幾個月幾乎不用錢。AWS Activate 給自籌資金的新創最多 $5,000，透過加速器或投資人推薦的最多 $200,000。
- **自己的私有網路。** VPC（virtual private cloud）是你在雲端上自己規劃的獨立網路：IP 範圍、子網路，以及哪些東西可以連到網際網路，都由你決定，所以資料庫可以完全沒有公開的位址。如果系統的其他部分已經在某個 VPC 裡，你的程式通常也要放進去。不過這條界線也不是絕對的：Render 的 Pro 方案也能透過 AWS PrivateLink 連到你 AWS VPC 裡的資源。

用大型雲端，有一件事一定要有：要有人會設定它的網路和權限（IAM）。如果團隊裡沒有這樣的人，獨立的服務商通常比較省事。合規認證本身不是選擇的關鍵：Render 有 SOC 2 Type 2、ISO 27001 和 HIPAA，Railway 有 SOC 2 Type II，也能簽 HIPAA 協議。

## 為什麼要用 container

Container 解決的是另一個問題：「在我的電腦上明明可以跑啊」。Image 裡已經包好了確切版本的 runtime、系統函式庫和依賴套件，所以同一個 image 在你的筆電、CI 和正式環境上都會一模一樣地執行。

- **到哪裡都是同一個 image。** 通過測試的那一版，就是上線的那一版。少裝了某個系統函式庫，會在建 image 的時候就發現，而不是部署之後才爆。
- **一台機器可以跑好幾個服務，彼此互不干擾。** API、worker 和 Redis 可以放在同一台 VPS 上，各自在自己的 container 裡，用各自需要的版本。
- **要搬家很容易。** 裝了 Docker 的 VPS、container 平台和大部分 PaaS 都接受同一個 image。換服務商時，只要讓新的主機去跑這個 image，不用整套設定重寫一遍。

Container 本身不是主機：你還是得決定它要在哪裡跑。相關指令，以及 Docker、Compose 和 Kubernetes 之間的關係，請見 [Docker](/blog/docker-basics) 那篇。

看一份小型 Node API 的 Dockerfile，就知道「打包」是什麼意思：

```dockerfile
FROM node:22-slim          # 從一個已經裝好 Node 的 image 開始
WORKDIR /app               # 接下來都在 /app 裡操作
COPY package*.json ./      # 先只複製依賴清單，下一步才能被快取
RUN npm ci --omit=dev      # 建 image 時就把依賴裝好
COPY . .                   # 再複製原始碼
CMD ["node", "server.js"]  # container 啟動時要執行的指令
```

## 誰負責什麼

![Who manages what on a VPS, a PaaS and serverless](diagram:vps-paas-serverless-responsibility)

從 VPS 往 serverless 走，交給平台處理的事越來越多：先是作業系統和重啟，再來是機器和擴充。代價是你能控制的越來越少，還多了一些限制，例如每次執行有時間上限、兩次請求之間不會記得任何東西。Container 平台和 PaaS 很像：你交一個 image，或交出原始碼讓它幫你建 image，機器由平台負責。

| | VPS | Container 平台 | PaaS | Serverless |
| --- | --- | --- | --- | --- |
| 你要負責 | 作業系統的更新修補、TLS、重啟、擴充 | Image、每一份要多少 CPU 和記憶體、要開幾份 | 選方案，其他沒什麼要管的 | Function 的大小、時間上限、cold start |
| 要小心 | 出事時沒有別人能幫你處理 | 要學的概念比較多（service、task、revision） | 每多一個服務，費用就多一份 | 兩次請求之間的狀態；一大堆小 function 很難追查 |
| 例子 | 放在 Hetzner VPS 上的 side project，用 Docker Compose 把 App、PostgreSQL 和 Redis 放在同一台 | 放在 Cloud Run（Google）上的 API image，晚上沒人用時縮到零 | 放在 Render 上的 Rails App，加上一個 worker 和一個 cron job | 放在 Lambda（AWS）上、一天只會被呼叫幾次的 Stripe webhook |

## 實際的專案會混搭

一個用 **Render** 的專案，可能同時跑一個 API（web service）、一個處理慢工作的 background worker，以及一個跑排程工作的 cron job，也就是同一個平台上有三個 process。一個用 **Vercel** 的專案，可能在那裡提供前端，旁邊再加幾個 API function。規模大一點的公司，可能把主要的 API 放在 container 平台、排程報表做成 serverless function、舊系統繼續留在虛擬機上。這些沒有哪個比較好，只是適合不同的後端。

平台的狀況會變，做決定之前要先確認。例如以前大家預設會用的 PaaS Heroku，在 2026 年 2 月進入只做維護的模式：服務照常運作、bug 照修，但不再推出新功能，所以新專案通常會選別的平台。

> [!PRINCIPLE] 核心原則
> 依工作的性質選類型，再依資料必須放在哪裡、手上有沒有雲端額度、必須加入哪個網路來選服務商。伺服器程式需要 runtime，而 container image 讓你可以在不同的 runtime 之間自由搬家。
