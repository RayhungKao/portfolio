---
title: "Docker：用途、怎麼組在一起，以及日常指令"
---

**你會學到：** 大家用 Docker 做什麼、映像檔怎麼變成執行中的容器、為什麼 Dockerfile 的順序很重要、port、network 和 volume 怎麼接在一起、Docker、Compose 和 Kubernetes 的關係，以及最該先檢查的陷阱。

[伺服器程式在哪裡執行](/blog/running-server-code)把容器稱為一種打包格式：你的 App 加上它需要的一切，打包起來讓它在哪裡都以同樣方式執行。這篇是實作的那一面。

## 大家用它做什麼

| 需求 | Docker 給你什麼 |
| --- | --- |
| 在每個地方部署同樣的東西 | 同一個映像檔在你的筆電、CI 和主機上執行起來都一樣。Render、Railway 和 Fly.io 都能直接從 Dockerfile 部署。 |
| 執行你依賴的服務 | 一行指令就有資料庫或快取，你的機器上什麼都不用裝。 |
| 啟動一個專案的整套服務 | 一份 `docker-compose.yml` 同時啟動 App、資料庫和 worker。 |
| 重現正式環境的錯誤 | 建置並執行主機上跑的東西，錯誤就不再是猜測。 |

## 從 Dockerfile 到執行中的容器

![From a Dockerfile to a running container](diagram:docker-build-push-run)

| 名詞 | 是什麼 |
| --- | --- |
| Dockerfile | 一份文字食譜：從這個 base 開始、安裝這個、複製那個、執行這個指令。 |
| Image（映像檔） | `docker build` 依食譜做出來的東西。唯讀、由快取的 layer 組成，用 `my-api:1.2` 這樣的 tag 命名。 |
| Container（容器） | 映像檔的一個執行中（或已停止）的實例。同一個映像檔可以啟動很多個。它寫入的東西在被移除時就會遺失。 |
| Registry | 存放和分享映像檔的地方：Docker Hub、GitHub Container Registry，或雲端供應商提供的。 |
| Volume | 活得比容器久的儲存空間。資料庫的檔案放在這裡。 |
| Network | 讓容器可以用名字找到彼此。 |

部署有兩種方式。一是把映像檔推到 registry，讓主機拉下來；二是讓主機從你的 Git repository 建置 Dockerfile，大多數 PaaS 都是這樣做的。

## 日常循環

1. 寫一份 `Dockerfile` 和一份 `.dockerignore`。
2. `docker build -t my-api .` 做出映像檔。
3. `docker run` 啟動容器；用 `docker logs` 和 `curl` 檢查。
4. 改程式後再建置一次。沒變的 layer 會從快取拿，所以這次建置很快——前提是 Dockerfile 的順序正確。

## Layer：順序決定重新建置的成本

![Layer order decides what a rebuild costs](diagram:docker-layer-cache)

Dockerfile 的每一行是一個 layer，Docker 會一直重用快取中的 layer，直到它依賴的東西改變為止。一旦某個 layer 變了，它後面的每個 layer 都要重建。所以把最少變動的放在最上面，原始碼放在最下面：

```dockerfile
FROM node:22-slim                 # 釘住版本；slim 映像檔比較小
WORKDIR /app
COPY package*.json ./             # 先放依賴清單……
RUN npm ci --omit=dev             # ……這樣這一層在清單改變前都會被快取
COPY . .                          # 原始碼放最後：它最常變動
ENV NODE_ENV=production
EXPOSE 3000                       # 記錄用的 port；它不會真的對外開放
CMD ["node", "server.js"]
```

```text
# .dockerignore：讓這些不要進入映像檔，也不要被上傳去建置
node_modules
.git
.env
dist
```

- **`RUN` 在建置時執行，`CMD` 在啟動時執行。** 安裝套件放在 `RUN`。資料庫 migration 放在 `CMD` 或啟動腳本，因為建置時資料庫還不存在。
- **釘住 base 映像檔，並留意它變舊。** `node:22-slim` 比 `node:latest` 好。但當被釘住的映像檔底下的 Linux 版本走到生命週期終點時，它的套件伺服器會搬走，一個好幾年都正常的 `apt-get install` 就會開始出現 404。
- **監聽 `0.0.0.0`，並從 `PORT` 讀取 port。** 平台會告訴容器要用哪個 port。綁在 `127.0.0.1` 的伺服器，從容器外面是連不到的。

## Port、network 與 volume

![Ports, a network and a volume on one machine](diagram:docker-ports-network-volume)

- **Port** 連接你的機器和容器。`-p 3000:3000` 讀作「你機器上的 port : 容器裡的 port」。
- **Network** 讓容器之間互相連接。在使用者自訂的 network 上，容器的名字可以當作主機名稱，所以 API 用 `db:5432` 就能連到資料庫。容器裡的 `localhost` 指的是那個容器本身，永遠不是你的機器或隔壁的容器。
- **Volume** 在容器消失後保留資料。

Compose 把這三者一次寫下來：

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app   # 「db」是下面的服務名稱
    depends_on:
      db:
        condition: service_healthy                  # 等到 Postgres 接受連線為止
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

`docker compose up -d` 在同一個 network 上啟動兩者。`docker compose down` 停止它們並保留 volume；`docker compose down -v` 會連 volume 一起刪掉。

## Docker、Compose 和 Kubernetes

這三個名字位在不同的層次，而且常常一起使用。

| | Docker | Docker Compose | Kubernetes |
| --- | --- | --- | --- |
| 做什麼 | 建置映像檔、執行容器 | 定義並執行由好幾個容器組成的應用程式 | 在一群機器組成的叢集上執行容器，並維持在你描述的狀態 |
| 典型用法 | 建置映像檔、執行單一容器 | 在筆電或一台伺服器上，把 App、資料庫和 Redis 一起啟動 | 分散在很多台機器上的正式系統 |

Kubernetes 的官方文件列出它替你做的事：容器失敗時重啟或替換、一步步推出新版本並可以回滾、把流量分散到各份副本、CPU 使用率升高時增加副本、把每個容器放到有空間的機器上，以及保管機密資料。文件也寫明它不做的事：它不建置你的應用程式，也不部署原始碼。Docker 負責建置映像檔，Kubernetes 負責執行它。

有一個改變常讓人混淆。從 1.24 版開始，Kubernetes 在它的機器上不再用 Docker Engine 執行容器，而是改用 containerd 這類 runtime。用 `docker build` 建出來的映像檔還是能跑，因為它們不是 Docker 專屬的格式：它們遵循 OCI（Open Container Initiative）的映像檔格式，任何符合標準的 runtime 都能拉下來執行（[Kubernetes 部落格](https://kubernetes.io/blog/2020/12/02/dont-panic-kubernetes-and-docker/)）。

自己架 Kubernetes 本身就是一份工作。三大雲都提供代管的版本：EKS（AWS）、GKE（Google）和 AKS（Azure）。[伺服器程式在哪裡執行](/blog/running-server-code)說明了它們和其他選項的相對位置。

## 日常指令

| 指令 | 做什麼 |
| --- | --- |
| `docker build -t name .` | 用這個資料夾的 Dockerfile 建置映像檔 |
| `docker run -d --name api -p 3000:3000 -e KEY=value name` | 在背景啟動容器、開放 port、設定變數 |
| `docker ps` / `docker ps -a` | 執行中的容器 / 所有容器，包括已停止的 |
| `docker logs -f api` | 持續追蹤容器的輸出 |
| `docker exec -it api sh` | 在執行中的容器裡開一個 shell |
| `docker rm -f api` | 停止並移除容器 |
| `docker network create name` | 建立 network；用 `--network name` 加入 |
| `docker system df` | 映像檔、容器和 volume 用了多少磁碟 |
| `docker compose up -d` / `down` | 啟動 / 停止 `docker-compose.yml` 裡的所有東西 |

## 最該先檢查的陷阱

- **資料消失。** 容器寫入的任何東西在 `docker rm` 之後就不見了。用 volume。
- **機密跑進映像檔。** Dockerfile 裡的 `COPY .env` 或 `ENV API_KEY=...`，任何拿到映像檔的人都讀得到，就算後面某一行把檔案刪掉也一樣。在執行時用 `-e` 或主機的設定傳入機密。
- **容器用 `localhost` 連不到你的機器。** 用 `host.docker.internal`（Docker Desktop 有提供；Linux 上要加 `--add-host=host.docker.internal:host-gateway`）。
- **Apple Silicon 建置的是 ARM 映像檔。** 大多數主機跑的是 x86 上的 Linux，同一個套件可能在一邊能建置、在另一邊失敗。加上 `--platform linux/amd64` 來建置和主機一樣的東西；這是模擬的，所以比較慢。
- **公開 URL。** 像 `APP_URL` 這種用來組重新導向或信件連結的變數，必須和你實際開啟的位址一致，本機和主機上都一樣。
- **磁碟被塞滿。** 舊的映像檔和建置快取會累積到好幾 GB。用 `docker system df` 檢查；`docker image prune` 會移除沒在用的映像檔。確認之前，先看清楚 prune 會刪掉什麼。

> [!PRINCIPLE] 核心原則
> 映像檔是你的 App 加上它需要的一切，建置一次、到處執行。資料放在 volume，機密放在執行時的變數，並在本機用主機執行它的方式來執行它。
