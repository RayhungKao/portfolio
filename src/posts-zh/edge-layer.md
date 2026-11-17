---
title: "Edge 層：CDN 與 reverse proxy"
---

**你會學到：** CDN 和 reverse proxy 是什麼、Cloudflare、CloudFront、Nginx 和 Caddy 怎麼搭配、為什麼 S3 不是其中之一，以及為什麼裝在你自己伺服器上的 proxy 擋不住大量灌進來的流量。

在瀏覽器和你的 App 之間，還有一層你很少需要寫程式的地方：edge。它在離使用者近的地方提供檔案、處理 TLS 連線，也決定哪些請求能進到你的伺服器。大部分情況下，這一層就是兩樣東西：CDN 和 reverse proxy。

## 一條路，兩個關卡

**Reverse proxy** 替你的 App 接下請求，再轉交給 App。**CDN**（Content Delivery Network）則是同時在很多城市運作的 reverse proxy，讓每個使用者都連到離自己近的那一份資料。所以 CDN 是 reverse proxy 的一種用法，不是另一種東西。

![A request through Cloudflare and Nginx to the app](diagram:edge-layer-request-path)

在這個架構裡，第一關是位在網際網路邊緣的 Cloudflare。快取過的檔案它自己就能回應，攻擊流量也會在接近你之前就被它擋掉。第二關是你自己 VPS 上的 Nginx：處理 TLS、把 `/api` 轉給後端、其他的轉給前端，並壓縮回應。你的 App 只會看到通過這兩關的請求。

## 四個產品，兩種工作

| 產品 | 跑在哪裡 | 常見用途 | 例子 |
| --- | --- | --- | --- |
| Cloudflare | Cloudflare 的網路，在使用者和你之間 | CDN、DNS、DDoS 防護、防火牆規則 | 一個架在 VPS 上的部落格，由 Cloudflare 快取圖片、擋掉機器人。 |
| CloudFront | Amazon 的網路，屬於 AWS | 給架在 AWS 上的網站用的 CDN | 放在 S3 bucket 裡的商品照片，透過 CloudFront 提供。 |
| Nginx | 你自己管理的伺服器（例如 VPS） | Reverse proxy、TLS、路由、靜態檔案 | `/api` 轉到 port 4000 的 Node 服務，其他的轉到 port 3000 的 Next.js。 |
| Caddy | 你自己管理的伺服器（例如 VPS） | 跟 Nginx 一樣，再加上自動處理 HTTPS | 一個 side project，想要能用的 HTTPS 憑證，又不想碰 certbot。 |

這張表要兩個兩個看。Nginx 和 Caddy 是二選一：一台機器裝一個就好。Cloudflare 和 CloudFront 也是二選一：選一個 CDN。但 CDN 和 reverse proxy 不是二選一，它們放在不同的位置，通常會一起用。

小專案通常第一個選 Cloudflare。截至 2026 年 10 月，W3Techs 的統計顯示大約 28% 的網站使用 Cloudflare；在已知有用 reverse proxy 的網站裡，它佔了大約 86%。另外，W3Techs 調查的網站中，約有 68% 完全沒有用 reverse proxy。

## S3 是儲存空間，不是 CDN

 一個 bucket 放在 AWS 的某一個 Region，所以每個請求都要連到那個 Region。S3 可以直接提供靜態網站，但 AWS 寫明它的 website endpoint 不支援 HTTPS。要用 HTTPS，AWS 建議在 bucket 前面放 CloudFront，或改用底層也是 CloudFront 的 Amplify Hosting。所以 AWS 上靜態網站的標準做法，是 S3 bucket 加上 CloudFront。

## 為什麼光靠 Nginx 擋不住大量流量

很多人會想：在 Nginx 加個 rate limiting 不就好了？這對付單一個發太多請求的 client 有用，但遇到大量灌進來的流量就沒用了，因為請求到了 Nginx 手上時，接收它的成本已經付出去了。

![Limits along the request path](diagram:request-path-resource-limits)

網路線路的頻寬是固定的，一旦塞滿，正常的封包也會跟著被丟掉。作業系統的 kernel 能記錄的連線數量有限，大量建立到一半的連線就能把它塞滿。每一次 TLS handshake 都要花 CPU，就算是 Nginx 下一步就要拒絕的請求也一樣。Nginx 和你的程式，都要等這三關過了才能動作。CDN 之所以有用，是因為它在你前面擋了一條粗得多的線路，攻擊流量在它那裡就被擋下來了。

## 三個容易出錯的地方

**取得 client 真正的 IP。** 放在 Cloudflare 後面時，每一條連到 Nginx 的連線都來自 Cloudflare 的位址，所以日誌和 rate limit 看到的都是同樣那幾個 IP。Cloudflare 會把真正的位址放在 `CF-Connecting-IP` header 裡。要設定 Nginx，只在來源是 Cloudflare 公布的 IP 範圍時才相信這個 header：

```nginx
# 每個 Cloudflare 範圍一行 set_real_ip_from
set_real_ip_from 173.245.48.0/20;
real_ip_header CF-Connecting-IP;
limit_req_status 429;   # 被 rate limit 時回 429「請求太多」；不寫這行，Nginx 會回 503
```

**SSL 模式。** Cloudflare 可以只加密瀏覽器到它這一段，再用沒加密的 HTTP 連到你的伺服器，這樣後面那一段就可能被看光。請用 *Full (strict)*：Cloudflare 連到你的伺服器時也加密，而且會檢查憑證是否有效。

**防火牆。** Cloudflare 只有在攻擊者繞不過它的時候才有用。如果你伺服器的 IP 外洩，對方可以直接打你的伺服器。把 VPS 的防火牆設成 port 80 和 443 只接受 Cloudflare IP 範圍來的連線。

> [!PRINCIPLE] 核心原則
> CDN 是 reverse proxy 的一種用法。Cloudflare 在網際網路的邊緣吸收流量，Nginx 在你自己管理的伺服器上負責轉送。
