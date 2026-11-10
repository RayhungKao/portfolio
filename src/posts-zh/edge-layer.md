---
title: "邊緣層：CDN 與反向代理"
---

**你會學到：** CDN 和反向代理是什麼、Cloudflare、CloudFront、Nginx 和 Caddy 怎麼搭在一起，以及為什麼你自己機器上的代理擋不住洪水般的流量。

在瀏覽器和你的 App 之間，有一層你很少為它寫程式的地方：邊緣層（edge）。它從離使用者近的地方提供檔案、終結 TLS 連線，並決定哪些請求有資格碰到你的伺服器。大部分情況可以用兩個名詞涵蓋：CDN 和反向代理。

## 一條路徑，兩個停靠站

**反向代理（reverse proxy）** 代替你的 App 接收請求，再轉送過去。**CDN**（內容傳遞網路）是一個同時在很多城市運作的反向代理，讓每個使用者都連到附近的副本。CDN 是反向代理能做的其中一件事，不是另一個物種。

![A request through Cloudflare and Nginx to the app](diagram:edge-layer-request-path)

在這個架構裡，第一站是位在網際網路邊緣的 Cloudflare。它自己就能回應快取的檔案，並在攻擊流量靠近你之前就吸收掉。第二站是跑在你自己 VPS 上的 Nginx。它終結 TLS、把 `/api` 送到後端、其他都送到前端，並壓縮回應。你的 App 只會看到通過這兩關的請求。

## 四個產品，兩種工作

| 產品 | 在哪裡運作 | 典型用途 | 例子 |
| --- | --- | --- | --- |
| Cloudflare | Cloudflare 的網路，介於使用者和你之間 | CDN、DNS、DDoS 防護、防火牆規則 | 一個放在 VPS 上的部落格，由 Cloudflare 快取圖片並擋掉機器人。 |
| CloudFront | Amazon 的網路，AWS 的一部分 | 給託管在 AWS 上的網站用的 CDN | 放在 S3 bucket 的商品照片，透過 CloudFront 傳送。 |
| Nginx | 你自己的機器 | 反向代理、TLS、路由、靜態檔案 | `/api` 送到 port 4000 的 Node 服務，其餘送到 port 3000 的 Next.js。 |
| Caddy | 你自己的機器 | 和 Nginx 一樣的工作，外加自動 HTTPS | 一個 side project，你想要能用的 HTTPS 憑證，又不想碰 certbot。 |

這張表要兩兩一組來看。Nginx 和 Caddy 互為替代：一台機器挑一個。Cloudflare 和 CloudFront 也互為替代：挑一個 CDN。但 CDN 和反向代理不是互相替代的，因為它們位在不同的地方，通常會疊在一起用。

Cloudflare 通常是小專案的首選。截至 2026 年 10 月，W3Techs 統計約 28% 的網站使用它，相當於在已知有使用反向代理的網站中佔了約 86%。它監測的網站中約有 68% 完全沒有使用反向代理。

## 為什麼光靠 Nginx 擋不住洪水

很容易就會想在 Nginx 加個 rate limiting 就當作搞定。這對付一個吵鬧的用戶端有用，但遇到洪水就失效了，因為等到 Nginx 看到請求時，接收它的成本已經付出去了。

![Limits along the request path](diagram:request-path-resource-limits)

網路線路的頻寬是固定的，管子塞滿了，正常的封包也一起被丟掉。核心（kernel）只維護有限的連線表，大量半開連線就能把它塞滿。每一次 TLS 交握都要花 CPU，即使是 Nginx 下一刻就會拒絕的請求也一樣。Nginx 和你的程式只能在這三關之後才行動。CDN 之所以有效，是因為它是擋在你前面一根大得多的管子，攻擊者在抵達的地方就被擋下了。

## 三個會咬人的細節

**真實的用戶端 IP。** 在 Cloudflare 後面，每條連到 Nginx 的連線都來自 Cloudflare 的位址，所以日誌和 rate limit 看到的都是同樣那幾個 IP。Cloudflare 會在 `CF-Connecting-IP` header 裡傳遞真實位址。告訴 Nginx 只在來源是 Cloudflare 公布的 IP 範圍時才信任這個 header：

```nginx
# 每個 Cloudflare 範圍一行 set_real_ip_from
set_real_ip_from 173.245.48.0/20;
real_ip_header CF-Connecting-IP;
limit_req_status 429;   # 預設的拒絕狀態碼是 503
```

**SSL 模式。** Cloudflare 可以只加密瀏覽器那一段，再用明文 HTTP 和你的伺服器溝通，這樣第二段就能被讀取。請用 *Full (strict)*：Cloudflare 對你的伺服器也加密，並檢查它的憑證是否有效。

**防火牆。** 只有在攻擊者繞不過 Cloudflare 時，它才幫得上忙。如果你伺服器的 IP 位址外洩，他們會直接把流量打過去。設定 VPS 防火牆，讓 port 80 和 443 只接受來自 Cloudflare IP 範圍的連線。

> [!PRINCIPLE] 核心原則
> CDN 是反向代理能做的其中一件事。Cloudflare 位在網際網路邊緣、吸收流量；Nginx 位在你自己的機器上、負責路由。
