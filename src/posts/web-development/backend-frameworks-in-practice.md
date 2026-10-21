---
title: "Backend frameworks in practice: what each one is for, and who uses it"
date: 2026-10-21
summary: "Frameworks in the same language differ in how much they decide for you. Real companies pick them for their team, their product and the system they already have."
series: web-development
order: 702
part: Choosing a backend architecture
draft: false
---

**What you'll learn:** how the main Node.js and Python frameworks differ, which kinds of companies and products use each family, and how to connect what you learn to the jobs that exist.

[The mainstream backend stacks](/blog/mainstream-backend-stacks) listed seven language families. Inside one family, the frameworks still differ. They differ mostly in two ways: how much the framework decides for you, and whether it is built mainly for APIs.

## Node.js frameworks

| Framework | What it is | Key difference |
| --- | --- | --- |
| Express | Minimal, and the oldest of the four | Handles routing and middleware. You choose validation, database access and project structure yourself. It has the most tutorials and the largest ecosystem. |
| Fastify | A more modern take on Express | Still small, but validates and serializes with JSON Schema, has a plugin system and built-in logging, and is faster. |
| NestJS | A framework with a fixed structure | Decides how the code is split into modules, controllers and services, and uses decorators and dependency injection. It is TypeScript-first and runs on top of Express or Fastify. It feels closest to Spring Boot. |
| Next.js route handlers | Part of a frontend framework, not a separate backend | You export `GET` or `POST` functions from a `route.ts` file in the `app` folder. Good for the few endpoints a Next.js site needs, often deployed as serverless functions. Not meant for a large, separate backend. |

## Python frameworks

| Framework | What it is | Key difference |
| --- | --- | --- |
| Django | Most things included | Comes with an ORM, database migrations, an admin interface, login and forms. Suits a full product built around a database. APIs are usually added with Django REST framework. |
| Flask | Minimal | Handles routing and requests. You choose the database library (often SQLAlchemy), validation and the rest. Good for small services and internal tools. |
| FastAPI | Built for APIs | Asynchronous from the start. Uses Python type hints with Pydantic to validate data, and generates OpenAPI documentation automatically. Has no ORM and no admin interface. |

## The same spectrum in both languages

| Position | Node.js | Python |
| --- | --- | --- |
| Minimal: you assemble the rest | Express | Flask |
| Schemas or types drive validation, with attention to speed | Fastify | FastAPI |
| The framework decides a lot for you | NestJS | Django |
| Built into a frontend framework | Next.js route handlers | No direct equivalent |

NestJS and Django both decide a lot, but different things. NestJS decides how the code is structured. Django gives you finished features.

## Who uses them

A large company almost always uses several stacks. "Company X uses framework Y" usually means one product or some services, not the whole company.

### Python and Node.js

| Framework | Typical need | Common products | Examples |
| --- | --- | --- | --- |
| Django | A product built around a database, with many features and an admin interface | Social and content platforms, ticketing, SaaS | Instagram, one of the largest Django sites. Sentry, the error-tracking service, is open source and built on Django. Eventbrite has described itself as one of the largest Django sites by traffic. Django itself came out of a newspaper, the Lawrence Journal-World. |
| Flask | A small, assembled web layer, often inside a larger tool | Data platforms, internal tools, prototypes | Apache Superset, the open-source BI tool, runs on Flask. |
| FastAPI | An API in front of a machine-learning model, or a high-concurrency API | AI products, ML platforms, data services | The [FastAPI site](https://fastapi.tiangolo.com/) quotes Microsoft (ML services), Uber (Ludwig's prediction server), Netflix (Dispatch, its crisis-management tool) and Cisco. Gradio, from Hugging Face, is built on FastAPI. |
| Express | A frontend team writing its own backend, a light API, or a backend for one frontend | E-commerce, startups, web backends | PayPal moved some services from Java to Node.js in 2013, and its Kraken.js framework is built on Express. |
| Fastify | Express's flexibility with more speed and schema validation | High-traffic APIs, microservices | The [Fastify site](https://fastify.dev/organizations/) names Nearform and Platformatic, the companies behind most of its development, as production users. |
| NestJS | A large team that needs one shared structure, or a team coming from Java or Angular | Enterprise systems, finance, retail, pharmaceuticals | The [NestJS site](https://nestjs.com/discover/companies) lists IBM, Adidas, Sanofi, Mercedes, BMW, GitLab, Decathlon, Roche and Société Générale. |
| Next.js route handlers | A Next.js site that needs a few endpoints: forms, webhooks, calls to other services | SaaS products, marketing sites, storefronts | A pattern more than a named stack. Companies rarely announce "our backend is route handlers". |

### The other families

| Framework | Common industries | Examples |
| --- | --- | --- |
| Spring Boot | Banks, insurance, telecoms, large e-commerce | Netflix made Spring Boot its core Java framework in 2018. Banks and insurers use it widely. |
| ASP.NET Core | Enterprises, government, game backends, companies already on Microsoft tools | Stack Overflow moved from .NET Framework to .NET Core around 2020. Bing also runs on .NET. |
| Go | Infrastructure, cloud, high-concurrency services | Uber runs many of its services in Go. Docker and Kubernetes are written in Go. |
| Rails | E-commerce platforms, SaaS, startups building a first version | Shopify, GitHub, Basecamp |
| Laravel | Agencies, small and medium business sites, content sites | PHP runs Wikipedia and WordPress, but neither uses Laravel. Laravel is common in agency work and smaller products. |

## By industry

- **Banks, insurance and telecoms:** Spring Boot and ASP.NET Core. Long maintenance, stability and an easy hiring pool matter most.
- **AI and machine-learning products:** FastAPI. The model is already in Python, so the API is too.
- **Content and social platforms:** Django and Rails. Many data models, and an admin interface from day one.
- **E-commerce:** Rails (Shopify), Spring Boot (large retailers), and Node.js for the backend behind the storefront.
- **Cloud and infrastructure:** Go.
- **Frontend-led startups and SaaS:** Next.js with Express or NestJS, with TypeScript on both sides.

Notice what decides most of these choices: the team and the system that already exists. The industry matters less than it first appears.

## Stacks change

The examples above are snapshots. Companies change stacks when their needs change.

- **PayPal** moved services from Java to Node.js so the same engineers could work on the browser and the server.
- **Netflix** built its own Java libraries in the early 2010s, then moved to Spring Boot once the Spring ecosystem caught up.
- **Apache Airflow** built its web interface on Flask, then moved to a FastAPI-based API server in Airflow 3.
- **Eventbrite** grew on Django, and its job postings describe a move toward separate services with other technologies.

The reasons are the same ones in [How to choose](/blog/mainstream-backend-stacks#how-to-choose): who is on the team, what the system needs now, and what costs less to run.

## Connecting this to real work

A framework is a tool for a job. To learn the one that matters for you:

1. **Start from the work you want.** Read ten job postings for the role and place you are aiming at. Count the frameworks they name.
2. **Learn the one that keeps appearing, in depth.** One framework you can ship with beats five you have tried.
3. **Learn the layers, not only the names.** [The same layers, different names](/blog/mainstream-backend-stacks#the-same-layers-different-names) shows that middleware, routing, validation, database access and background jobs exist everywhere. Once you know them in one framework, the next one is mostly new spelling.
4. **Build something a company would build.** An admin dashboard on Django, an API in front of a model on FastAPI, or a service with a fixed structure on NestJS teaches more than a to-do list.

> [!PRINCIPLE] Core principle
> Companies pick frameworks for their team, their product and the system they already have. Learn the one your target jobs use, and learn the layers underneath so you can move to the next.
