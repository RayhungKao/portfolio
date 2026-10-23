---
title: "Docker: what it is for, how it fits together, and the everyday commands"
date: 2026-10-23
summary: "Images, containers, layers, ports, networks and volumes in three diagrams, the everyday workflow and commands, and the pitfalls to check first."
series: web-backend
order: 502
part: Running the backend
draft: false
---

**What you'll learn:** what people use Docker for, how an image becomes a running container, why the order of a Dockerfile matters, how ports, networks and volumes connect, and the pitfalls to check first.

[Where server code runs](/blog/running-server-code) calls a container a packaging format: your app and everything it needs, packed so it runs the same anywhere. This article is the hands-on side.

## What people use it for

| Need | What Docker gives you |
| --- | --- |
| Deploy the same thing everywhere | One image runs the same on your laptop, in CI and on the host. Render, Railway and Fly.io can all deploy straight from a Dockerfile. |
| Run a service you depend on | A database or a cache in one command, with nothing installed on your machine. |
| Start a project's whole stack | One `docker-compose.yml` starts the app, the database and a worker together. |
| Reproduce a production failure | Build and run what the host runs, and the failure stops being a guess. |

## From a Dockerfile to a running container

![From a Dockerfile to a running container](diagram:docker-build-push-run)

| Word | What it is |
| --- | --- |
| Dockerfile | A text recipe: start from this base, install this, copy that, run this command. |
| Image | What `docker build` makes from the recipe. Read-only, made of cached layers, named with a tag such as `my-api:1.2`. |
| Container | A running (or stopped) instance of an image. Many can start from one image. What it writes is lost when it is removed. |
| Registry | Where images are stored and shared: Docker Hub, GitHub Container Registry, or a cloud provider's. |
| Volume | Storage that outlives a container. A database's files go here. |
| Network | Lets containers reach each other by name. |

There are two ways to deploy. Either push the image to a registry and let the host pull it, or let the host build the Dockerfile from your Git repository, which is what most PaaS do.

## The everyday loop

1. Write a `Dockerfile` and a `.dockerignore`.
2. `docker build -t my-api .` makes the image.
3. `docker run` starts a container; check it with `docker logs` and `curl`.
4. Change code and build again. Unchanged layers come from the cache, so this build is fast, if the Dockerfile is in the right order.

## Layers: order decides what a rebuild costs

![Layer order decides what a rebuild costs](diagram:docker-layer-cache)

Each line of a Dockerfile is a layer, and Docker reuses a layer from the cache until something it depends on changes. Once one layer changes, every layer after it is rebuilt. So put what changes least at the top and your source code at the bottom:

```dockerfile
FROM node:22-slim                 # pin a version; slim images are smaller
WORKDIR /app
COPY package*.json ./             # the dependency list first ...
RUN npm ci --omit=dev             # ... so this layer is cached until it changes
COPY . .                          # source last: it changes most often
ENV NODE_ENV=production
EXPOSE 3000                       # documents the port; it does not publish it
CMD ["node", "server.js"]
```

```text
# .dockerignore: keep these out of the image and out of the build upload
node_modules
.git
.env
dist
```

- **`RUN` happens at build time, `CMD` at start time.** Installing packages goes in `RUN`. Migrating a database goes in `CMD` or a start script, because the database is not there during the build.
- **Pin the base image, and watch it age.** `node:22-slim` is better than `node:latest`. But when the Linux release under a pinned image reaches end of life, its package servers move, and an `apt-get install` that worked for years starts failing with 404s.
- **Listen on `0.0.0.0` and read the port from `PORT`.** Platforms tell the container which port to use. A server bound to `127.0.0.1` cannot be reached from outside its container.

## Ports, networks and volumes

![Ports, a network and a volume on one machine](diagram:docker-ports-network-volume)

- **A port** connects your machine to a container. `-p 3000:3000` reads as "port on your machine : port in the container".
- **A network** connects containers to each other. On a user-defined network, a container's name works as its host name, so the API reaches the database at `db:5432`. `localhost` inside a container is that container, never your machine or a neighbour.
- **A volume** keeps data after the container is gone.

Compose writes all three down once:

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app   # "db" is the service name below
    depends_on:
      db:
        condition: service_healthy                  # wait until Postgres accepts connections
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

`docker compose up -d` starts both on one network. `docker compose down` stops them and keeps the volume; `docker compose down -v` deletes the volume too.

## Everyday commands

| Command | What it does |
| --- | --- |
| `docker build -t name .` | Build an image from the Dockerfile in this folder |
| `docker run -d --name api -p 3000:3000 -e KEY=value name` | Start a container in the background, publish a port, set a variable |
| `docker ps` / `docker ps -a` | Running containers / all containers, including stopped ones |
| `docker logs -f api` | Follow a container's output |
| `docker exec -it api sh` | Open a shell inside a running container |
| `docker rm -f api` | Stop and remove a container |
| `docker network create name` | Make a network; join it with `--network name` |
| `docker system df` | How much disk images, containers and volumes use |
| `docker compose up -d` / `down` | Start / stop everything in `docker-compose.yml` |

## Pitfalls to check first

- **Data disappears.** Anything a container writes is gone after `docker rm`. Use a volume.
- **Secrets end up in the image.** `COPY .env` or `ENV API_KEY=...` in a Dockerfile is readable by anyone with the image, even if a later line deletes the file. Pass secrets at run time with `-e` or the host's settings.
- **A container cannot reach your machine at `localhost`.** Use `host.docker.internal` (Docker Desktop provides it; on Linux add `--add-host=host.docker.internal:host-gateway`).
- **Apple Silicon builds ARM images.** Most hosts run Linux on x86, and a package can build on one and fail on the other. Add `--platform linux/amd64` to build what the host builds; it is emulated, so slower.
- **Public URLs.** A variable such as `APP_URL` that builds redirects or email links must match the address you actually open, locally and on the host.
- **Disk fills up.** Old images and build cache reach gigabytes. Check with `docker system df`; `docker image prune` removes unused images. Read what a prune will delete before you confirm.

> [!PRINCIPLE] Core principle
> An image is your app plus everything it needs, built once and run anywhere. Keep data in volumes, secrets in run-time variables, and run it locally the way the host runs it.
