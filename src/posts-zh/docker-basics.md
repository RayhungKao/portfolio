---
title: "Docker：用途、怎麼組合，以及日常指令"
---

**你會學到：** 大家用 Docker 做什麼、image 怎麼變成跑起來的 container、為什麼 Dockerfile 的順序很重要、port、network 和 volume 怎麼串起來、Docker、Compose 和 Kubernetes 之間的關係，以及最該先注意的幾個坑。

[伺服器程式在哪裡執行](/blog/running-server-code)說過，container 是一種打包格式：把你的 App 和它需要的所有東西包在一起，放到哪裡都能用同樣的方式執行。這篇講實際怎麼操作。

## 大家拿它來做什麼

| 需求 | Docker 能幫你什麼 |
| --- | --- |
| 每個環境都部署同樣的東西 | 同一個 image 在你的筆電、CI 和主機上，跑起來都一樣。Render、Railway 和 Fly.io 都能直接用 Dockerfile 部署。 |
| 跑你需要用到的服務 | 一行指令就有資料庫或快取可以用，電腦上什麼都不用裝。 |
| 一次啟動整個專案的服務 | 一份 `docker-compose.yml` 就能同時啟動 App、資料庫和 worker。 |
| 重現正式環境的錯誤 | 在本機建置、執行跟主機上一樣的東西，就不用再靠猜。 |

## 從 Dockerfile 到跑起來的 container

![From a Dockerfile to a running container](diagram:docker-build-push-run)

| 名詞 | 是什麼 |
| --- | --- |
| Dockerfile | 一份文字寫的步驟說明：從哪個 base image 開始、裝什麼、複製什麼、最後執行什麼指令。 |
| Image | 用 `docker build` 照著 Dockerfile 做出來的成品。唯讀，由好幾個可以快取的 layer 組成，用 `my-api:1.2` 這樣的 tag 命名。 |
| Container | 從 image 啟動的一個執行個體，可能正在跑，也可能已經停了。同一個 image 可以啟動很多個 container。Container 被刪掉時，它寫入的東西也會跟著消失。 |
| Registry | 存放和分享 image 的地方：Docker Hub、GitHub Container Registry，或雲端服務商提供的 registry。 |
| Volume | Container 刪掉後還會留著的儲存空間。資料庫的檔案就放在這裡。 |
| Network | 讓 container 之間可以用名字找到對方。 |

部署有兩種方式：一是把 image 推到 registry，再讓主機拉下來；二是讓主機直接從你的 Git repository 用 Dockerfile 建置，大部分 PaaS 都是這樣做。

## 日常的操作流程

1. 寫一份 `Dockerfile` 和一份 `.dockerignore`。
2. 用 `docker build -t my-api .` 建出 image。
3. 用 `docker run` 啟動 container，再用 `docker logs` 和 `curl` 確認有沒有正常運作。
4. 改完程式後重新建置。沒變動的 layer 會直接用快取，所以第二次建置很快，前提是 Dockerfile 的順序寫對了。

## Layer：順序決定重新建置要花多少時間

![Layer order decides what a rebuild costs](diagram:docker-layer-cache)

Dockerfile 的每一行都是一個 layer。只要一個 layer 用到的東西沒變，Docker 就會直接用快取。但只要某個 layer 變了，它後面的每一個 layer 都要重新建置。所以最少變動的放最上面，原始碼放最下面：

```dockerfile
FROM node:22-slim                 # 固定版本；slim image 比較小
WORKDIR /app
COPY package*.json ./             # 先複製依賴清單……
RUN npm ci --omit=dev             # ……清單沒變，這一層就會一直用快取
COPY . .                          # 原始碼放最後：它最常變動
ENV NODE_ENV=production
EXPOSE 3000                       # 只是標註用哪個 port，不會真的對外開放
CMD ["node", "server.js"]
```

```text
# .dockerignore：這些不要放進 image，也不要上傳去建置
node_modules
.git
.env
dist
```

- **`RUN` 在建置時執行，`CMD` 在啟動時執行。** 安裝套件寫在 `RUN`。資料庫 migration 要寫在 `CMD` 或啟動腳本裡，因為建置的時候資料庫還不存在。
- **固定 base image 的版本，也要留意它會過時。** `node:22-slim` 比 `node:latest` 好。但被固定的 image 底下用的 Linux 版本，一旦過了支援期限，它的套件伺服器就會搬走，原本好幾年都正常的 `apt-get install` 就會開始出現 404。
- **監聽 `0.0.0.0`，並從 `PORT` 讀取要用的 port。** 平台會告訴 container 該用哪個 port。如果伺服器只綁在 `127.0.0.1`，從 container 外面是連不進來的。

## Port、network 與 volume

![Ports, a network and a volume on one machine](diagram:docker-ports-network-volume)

- **Port** 把你的電腦和 container 接起來。`-p 3000:3000` 的意思是「你電腦上的 port : container 裡的 port」。
- **Network** 讓 container 彼此連線。在自己建立的 network 上，container 的名字就能當主機名稱用，所以 API 用 `db:5432` 就連得到資料庫。Container 裡的 `localhost` 指的是這個 container 自己，不是你的電腦，也不是旁邊的 container。
- **Volume** 讓資料在 container 刪掉之後還留著。

Compose 讓你把這三樣一次寫清楚：

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app   # 「db」就是下面那個服務的名稱
    depends_on:
      db:
        condition: service_healthy                  # 等 Postgres 可以接受連線了再啟動
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 2s
      retries: 10
volumes:
  db-data:
```

`docker compose up -d` 會在同一個 network 上把兩個服務都啟動。`docker compose down` 會停掉它們，但保留 volume；`docker compose down -v` 則會連 volume 一起刪掉。

## Docker、Compose 和 Kubernetes

這三個名字處理的是不同層次的事，而且常常一起用。

| | Docker | Docker Compose | Kubernetes |
| --- | --- | --- | --- |
| 做什麼 | 建置 image、執行 container | 定義並執行由好幾個 container 組成的應用程式 | 在由很多台機器組成的 cluster 上執行 container，並讓它們一直維持在你設定的狀態 |
| 常見用法 | 建置 image、執行單一個 container | 在筆電或一台伺服器上，把 App、資料庫和 Redis 一起啟動 | 分散在很多台機器上的正式環境 |

Kubernetes 的官方文件列出了它會幫你做的事：container 掛掉時重新啟動或換掉、一步一步推出新版本，出問題時可以退回、把流量分散到每一份副本上、CPU 用量變高時多開幾份、把每個 container 放到還有空間的機器上，以及保管機密資料。文件也寫清楚它不做的事：它不會幫你建置應用程式，也不會部署原始碼。建置 image 是 Docker 的事，執行 image 才是 Kubernetes 的事。

有一個改變常讓人搞混。從 1.24 版開始，Kubernetes 不再用 Docker Engine 在機器上執行 container，而是改用 containerd 這類 runtime。不過用 `docker build` 建出來的 image 照樣能跑，因為它們不是 Docker 專用的格式：它們遵循 OCI（Open Container Initiative）的 image 格式，任何符合標準的 runtime 都能拉下來執行（[Kubernetes 部落格](https://kubernetes.io/blog/2020/12/02/dont-panic-kubernetes-and-docker/)）。

自己架 Kubernetes 本身就是一份全職工作。三大雲端都有代管的版本：EKS（AWS）、GKE（Google）和 AKS（Azure）。它們跟其他選擇怎麼比，請見[伺服器程式在哪裡執行](/blog/running-server-code)。

## 日常指令

| 指令 | 做什麼 |
| --- | --- |
| `docker build -t name .` | 用目前資料夾裡的 Dockerfile 建置 image |
| `docker run -d --name api -p 3000:3000 -e KEY=value name` | 在背景啟動 container、對外開放 port、設定環境變數 |
| `docker ps` / `docker ps -a` | 列出正在跑的 container / 列出所有 container，包括已經停的 |
| `docker logs -f api` | 持續看 container 的輸出 |
| `docker exec -it api sh` | 在正在跑的 container 裡開一個 shell |
| `docker rm -f api` | 停掉並刪除 container |
| `docker network create name` | 建立一個 network；用 `--network name` 加入 |
| `docker system df` | 查看 image、container 和 volume 用了多少磁碟空間 |
| `docker compose up -d` / `down` | 啟動 / 停止 `docker-compose.yml` 裡的所有服務 |

## 最該先注意的坑

- **資料不見了。** Container 寫入的東西，`docker rm` 之後就會消失。要保留的資料請用 volume。
- **機密被包進 image 裡。** 在 Dockerfile 裡寫 `COPY .env` 或 `ENV API_KEY=...`，任何拿到 image 的人都看得到，就算後面有一行把檔案刪掉也一樣。機密要在執行時用 `-e` 或主機的設定傳進去。
- **Container 用 `localhost` 連不到你的電腦。** 要用 `host.docker.internal`（Docker Desktop 有提供；Linux 上要加 `--add-host=host.docker.internal:host-gateway`）。
- **Apple Silicon 建出來的是 ARM image。** 大部分主機跑的是 x86 的 Linux，同一個套件可能在你的電腦上建得起來，到了主機上卻失敗。加上 `--platform linux/amd64`，就能建出跟主機一樣的 image；只是這要靠模擬，所以會比較慢。
- **公開網址設錯。** 像 `APP_URL` 這種用來組 redirect 網址或信件連結的變數，一定要跟你實際打開的網址一致，本機和主機上都一樣。
- **磁碟被塞爆。** 舊的 image 和建置快取會越積越多，累積到好幾 GB。用 `docker system df` 查看用量；`docker image prune` 會刪掉沒在用的 image。按下確認之前，先看清楚它要刪哪些東西。

> [!PRINCIPLE] 核心原則
> Image 就是你的 App 加上它需要的所有東西，建置一次，到哪裡都能跑。資料放在 volume，機密在執行時用環境變數傳入，在本機也用跟主機一樣的方式來跑它。
