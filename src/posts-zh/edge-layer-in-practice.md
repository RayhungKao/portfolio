---
title: "邊緣層實務：Nginx、Caddy 與四種真實架構"
---

**你會學到：** 一份在 Cloudflare 後面能用的 Nginx 設定、用 Caddy 做同樣的工作，以及四種可以比較的真實架構。

[邊緣層](/blog/edge-layer)解釋了 CDN 和反向代理在做什麼。這篇是設定檔和架構。

## 常見架構裡每一層在做什麼

![A request through Cloudflare and Nginx to two apps](diagram:cloudflare-nginx-layered)

![What the Cloudflare edge does before the origin](diagram:cloudflare-reverse-proxy-path)

Cloudflare 替瀏覽器終結 TLS、過濾攻擊、回應快取的檔案。你自己伺服器上的 Nginx 把 `/` 路由到 Next.js，把 `/api` 路由到 Express API。

## 完整的 Nginx 設定

```nginx
# /etc/nginx/conf.d/app.conf

# 連進來的是 Cloudflare，所以要還原訪客的真實位址。
# 這些範圍公布在 https://www.cloudflare.com/ips 而且會變動，
# 所以要從那份清單產生這幾行，而不是複製一次就算了。
set_real_ip_from 198.51.100.0/24;   # 僅為範例：這裡要放上每一個 Cloudflare 範圍
real_ip_header   CF-Connecting-IP;

# 每位訪客每秒 10 個請求，允許短暫突發。
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_status 429;

server {
    listen 443 ssl;
    http2 on;                                         # Nginx 1.25.1+；較舊版本：listen 443 ssl http2;
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

有三點要注意。`set_real_ip_from` 加上 `real_ip_header` 讓 `$remote_addr`（以及因此而來的 rate limit 和日誌）使用訪客的位址，而不是 Cloudflare 的位址。`limit_req_status 429` 讓被限流的訪客看到「請求太多」，而不是預設的 503。而 origin 憑證讓 Cloudflare 能用 HTTPS 和 Nginx 溝通，也就是「Full (strict)」SSL 模式，而不是較弱的「Flexible」。

## 拒絕繞過 Cloudflare 的流量

Cloudflare 的過濾和 rate limit 只有在每個請求都經過 Cloudflare 時才能保護你。你伺服器的 IP 位址可能外洩（舊的 DNS 紀錄、email header、對位址範圍的掃描），而直接送到它的請求會略過整個邊緣層。可以在兩個層級之一關上這扇門。

**在防火牆：** 只接受來自 Cloudflare 範圍的 HTTPS，讓直接連線根本碰不到 Nginx。

```bash
ufw default deny incoming
ufw allow 22/tcp                                              # 保留 SSH
ufw allow from 173.245.48.0/20 to any port 443 proto tcp     # 每個 Cloudflare 範圍重複一次
```

**在 Nginx，用 Authenticated Origin Pulls：** 在 Cloudflare 開啟這個功能後，Cloudflare 每次連到你的 origin 都會出示一張用戶端憑證。Nginx 拒絕任何沒有這張憑證的連線：

```nginx
ssl_client_certificate /etc/ssl/cloudflare-origin-pull-ca.pem;  # Cloudflare 的 origin-pull CA
ssl_verify_client on;
```

Cloudflare 的範圍變動時，防火牆規則要跟著更新；憑證檢查則不用。兩者都做是很常見的。

## 用 Caddy 做同樣的工作

```text
# Caddyfile
{
    servers {
        trusted_proxies static 198.51.100.0/24   # 僅為範例：每一個 Cloudflare 範圍
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

Caddy 會自己取得並更新 `example.com` 的憑證，所以 Nginx 版本裡的憑證那幾行都不需要了。`servers` 區塊扮演 `set_real_ip_from` 和 `real_ip_header` 的角色；如果你沒有用 Cloudflare，就把它刪掉。Caddy 沒有內建 rate limiter，所以每位訪客的限流需要 plugin，或在其他層做。

## 四種真實架構

| 架構 | 前面放什麼 | 誰跑什麼 | 適合 |
| --- | --- | --- | --- |
| CDN 上的靜態網站 | S3 bucket 加 CloudFront，或靜態託管 | 沒有任何你的東西在跑 | 作品集或文件網站 |
| 一台 VPS 加 Caddy | Caddy 和 App 在同一台機器上 | 你跑機器和 App | 想不費力就有 HTTPS 的 side project |
| VPS 加 Nginx，放在 Cloudflare 後面 | Cloudflare，然後 Nginx，然後各個 App | Cloudflare 跑邊緣層；你跑 Nginx 和 App | 有 API、需要攻擊過濾和快取的網站 |
| 託管平台 | 平台自己的邊緣層，沒有你的 Nginx | 平台 | 放在 Vercel 或 Netlify 上的 Next.js App |

託管平台那一列是同一個概念的另一面。你不用設定邊緣層，因為平台的邊緣層是內建的；代價是你放棄了細節的控制權，例如自訂的 rate limit 規則。

> [!PRINCIPLE] 核心原則
> 邊緣層是一疊層，每一層都需要知道真實的訪客位址、用 HTTPS 和下一層溝通，並拒絕繞過它前面那一層的流量。
