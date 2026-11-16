---
title: "Edge 層實務：Nginx、Caddy 與四種實際架構"
---

**你會學到：** 一份放在 Cloudflare 後面能直接用的 Nginx 設定、怎麼用 Caddy 做到同樣的事，以及四種實際架構的比較。

[Edge 層](/blog/edge-layer)說明了 CDN 和 reverse proxy 在做什麼，這篇則是實際的設定檔和架構。

## 常見架構裡每一層做什麼

![A request through Cloudflare and Nginx to two apps](diagram:cloudflare-nginx-layered)

![What the Cloudflare edge does before the origin](diagram:cloudflare-reverse-proxy-path)

Cloudflare 負責跟瀏覽器之間的 TLS、擋掉攻擊、回應快取過的檔案。你自己伺服器上的 Nginx 則把 `/` 轉給 Next.js，把 `/api` 轉給 Express API。

## 完整的 Nginx 設定

```nginx
# /etc/nginx/conf.d/app.conf

# 連進來的都是 Cloudflare，所以要還原訪客真正的位址。
# 這些範圍公布在 https://www.cloudflare.com/ips，而且會變，
# 所以這幾行要從那份清單自動產生，不要複製一次就不管了。
set_real_ip_from 198.51.100.0/24;   # 這只是範例：這裡要列出每一個 Cloudflare 範圍
real_ip_header   CF-Connecting-IP;

# 每位訪客每秒 10 個請求，允許短時間的爆量。
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_status 429;

server {
    listen 443 ssl;
    http2 on;                                         # Nginx 1.25.1 以上；舊版要寫成 listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/ssl/example.com.pem;       # Cloudflare Origin 憑證
    ssl_certificate_key /etc/ssl/example.com.key;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:4000;               # Express API
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;  # 還原後的訪客位址
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;               # Next.js
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

有三個地方要注意。第一，`set_real_ip_from` 加上 `real_ip_header`，讓 `$remote_addr` 變成訪客真正的位址，而不是 Cloudflare 的位址，rate limit 和日誌也就跟著正確了。第二，`limit_req_status 429` 讓被限流的訪客看到「請求太多」，而不是預設的 503。第三，origin 憑證讓 Cloudflare 能用 HTTPS 連到 Nginx，也就是 SSL 模式選「Full (strict)」，而不是比較不安全的「Flexible」。

## 擋掉繞過 Cloudflare 的流量

Cloudflare 的過濾和 rate limit，只有在每個請求都經過它時才保護得到你。但你伺服器的 IP 可能會外洩（舊的 DNS 紀錄、email header、有人掃描整段位址），直接打到這個 IP 的請求就完全繞過了 edge 層。你可以從下面兩個地方把這個漏洞補起來。

**在防火牆擋：** HTTPS 只接受 Cloudflare 範圍來的連線，直接連進來的請求根本到不了 Nginx。

```bash
ufw default deny incoming
ufw allow 22/tcp                                              # 保留 SSH
ufw allow from 173.245.48.0/20 to any port 443 proto tcp     # 每個 Cloudflare 範圍都要加一行
```

**在 Nginx 擋，用 Authenticated Origin Pulls：** 在 Cloudflare 開啟這個功能後，Cloudflare 每次連到你的 origin，都會出示一張 client 憑證。Nginx 只要拒絕沒有這張憑證的連線就好：

```nginx
ssl_client_certificate /etc/ssl/cloudflare-origin-pull-ca.pem;  # Cloudflare 的 origin-pull CA
ssl_verify_client on;
```

Cloudflare 的 IP 範圍一變，防火牆規則就要跟著更新；憑證檢查則不用。很多人兩種都會做。

## 用 Caddy 做同樣的事

```text
# Caddyfile
{
    servers {
        trusted_proxies static 198.51.100.0/24   # 這只是範例：要列出每一個 Cloudflare 範圍
        client_ip_headers CF-Connecting-IP
    }
}

example.com {
    encode zstd gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:4000
    }

    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

Caddy 會自己申請並更新 `example.com` 的憑證，所以 Nginx 版本裡跟憑證有關的那幾行都不用寫。`servers` 區塊的作用就等於 `set_real_ip_from` 和 `real_ip_header`；沒有用 Cloudflare 的話，把它刪掉就好。Caddy 沒有內建 rate limiter，要針對每位訪客限流，得裝 plugin，或在其他層處理。

## 四種實際架構

| 架構 | 前面放什麼 | 誰負責跑什麼 | 適合 |
| --- | --- | --- | --- |
| CDN 上的靜態網站 | S3 bucket 加 CloudFront，或靜態網站託管 | 沒有任何你的程式在跑 | 作品集、文件網站 |
| 一台 VPS 加 Caddy | Caddy 和 App 在同一台機器上 | 機器和 App 都由你負責 | 想輕鬆搞定 HTTPS 的 side project |
| VPS 加 Nginx，前面放 Cloudflare | Cloudflare，接著是 Nginx，再接到各個 App | Cloudflare 負責 edge 層；Nginx 和 App 由你負責 | 有 API、需要擋攻擊和快取的網站 |
| 託管平台 | 平台自己的 edge 層，不用你的 Nginx | 平台 | 放在 Vercel 或 Netlify 上的 Next.js App |

託管平台那一列其實是同一件事的另一面。你不用設定 edge 層，因為平台已經內建了；代價是你沒辦法調整細節，例如自訂 rate limit 的規則。

> [!PRINCIPLE] 核心原則
> Edge 層是一層疊一層的。每一層都要知道訪客真正的位址、用 HTTPS 連到下一層，並擋掉繞過前一層直接進來的流量。
