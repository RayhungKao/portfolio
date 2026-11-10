---
title: "伺服器程式在哪裡執行：VPS、容器、PaaS 與 serverless"
---

**你會學到：** VPS、容器、PaaS 和 serverless 各自是什麼、每一種由誰管理什麼，以及真實專案怎麼混搭它們。

靜態檔案只需要一個主機。每次請求都要執行的程式則需要一個 **runtime（執行環境）**：一個啟動你的程式、維持它健康、並給它一個網路位址的地方。取得它有四種常見方式。

## 四個選項

| 選項 | 是什麼 | 例子 |
| --- | --- | --- |
| VPS | 租來的一台虛擬 Linux 機器。所有東西都由你安裝和執行。 | 一台 DigitalOcean droplet，在 Nginx 後面跑 Node |
| 容器 | 把你的 App 和它的依賴打包成一個映像檔，在哪裡都能以同樣的方式執行。它是打包格式，不是主機：容器還是得在某個地方執行。 | 一份 Dockerfile，在 VPS 或平台上執行 |
| PaaS | 從一次 Git push 或一個映像檔建置並執行你的 App，並處理重啟和 HTTPS 的平台。 | Render、Railway、Fly.io |
| Serverless | 由平台在每次請求時啟動、之後停止的小型 function，依執行次數計費。 | Vercel Functions、AWS Lambda、Cloudflare Workers |

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

從 VPS 往 serverless 移動，你交出去的越來越多：先是作業系統和重啟，然後是機器和擴展。代價是控制權變少，還有一些限制，例如每次執行的時間上限，以及請求之間沒有記憶。

## 怎麼選

| | VPS | PaaS | Serverless |
| --- | --- | --- | --- |
| 最適合 | 你想要控制權，或固定的低成本 | 你想推了程式碼就不用再想機器的事 | 流量起伏很大，而且後端很小 |
| 你要處理 | 作業系統修補、TLS、重啟、擴展 | 選方案；其他沒什麼 | Function 大小、時間限制、冷啟動 |
| 小心 | 除了你沒有人值班 | 每多一個服務成本就增加 | 請求之間的狀態；一大堆小 function 很難追 |

## 真實專案會混搭

一個用 **Render** 的專案，可能跑一個 API（web service）、一個處理慢工作的背景 worker，以及一個做排程工作的 cron job——同一個平台上三個行程。一個用 **Vercel** 的專案，可能在那裡提供前端，並在旁邊加幾個 API function。兩者沒有哪個比較好；它們適合不同的後端。後端可以有哪些形態、怎麼挑選，在[選擇技術棧](/blog/choosing-the-stack)。

平台的狀態會變，所以決定之前先確認。例如，曾經是預設 PaaS 的 Heroku 在 2026 年 2 月進入維持性工程模式：它繼續運作、繼續修 bug，但不再加新功能，所以新專案通常會找別的平台。

> [!PRINCIPLE] 核心原則
> 伺服器程式需要一個 runtime。從 VPS 到 PaaS 再到 serverless，是用控制權換取更少需要管理的東西。
