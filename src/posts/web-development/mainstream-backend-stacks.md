---
title: "The mainstream backend stacks: language, framework and database"
date: 2026-10-21
summary: "Seven language families cover most backends. Their frameworks name things differently, but the layers inside are the same, and a system split into microservices can mix them."
series: web-backend
order: 201
part: Choosing a backend architecture
draft: false
---

**What you'll learn:** the language families behind most backends, what usage numbers do and do not say, how four frameworks name the same layers, what changes when a system is split into microservices, and how to choose.

A backend stack is four choices: a language and runtime, a framework, a database, and a place to run it. [Where server code runs](/blog/running-server-code) covers the last one. This article covers the first three.

## Seven families

| Family | Common frameworks | Commonly known for |
| --- | --- | --- |
| Node.js / TypeScript | Express, NestJS, Fastify, Next.js Route Handlers | One language in the browser and on the server |
| Java / Kotlin | Spring Boot | Large, long-lived systems and a mature ecosystem |
| Python | Django, FastAPI, Flask | Quick to write, and the usual language for data and AI work |
| C# | ASP.NET Core | Strong tooling and a complete platform from Microsoft |
| Go | The standard library, Gin, Echo | Small services that start fast and deploy as one file |
| Ruby | Rails | Conventions that get a product built quickly |
| PHP | Laravel | A framework with most things included |

As in [UI library and framework](/blog/ui-library-and-framework), these are reputations, not verdicts. [Backend frameworks in practice](/blog/backend-frameworks-in-practice) compares the Node.js and Python frameworks and shows which companies use each family.

## What the numbers say

The Stack Overflow Developer Survey 2025 asked all respondents which web frameworks and technologies they used: Node.js 48.7%, ASP.NET Core 19.7%, FastAPI 14.8%, Spring Boot 14.7%, Flask 14.4%, Django 12.6%, Laravel 8.9% and Rails 5.9%. Express alone was 19.9%.

Three cautions. The respondents are developers of every kind, not only backend developers. Node.js is a runtime, counted in the same list as frameworks. And respondents could pick more than one, so the shares do not add up: you cannot sum Django, FastAPI and Flask to get a figure for Python. The numbers show what is common, not what is best.

For databases, the same survey put PostgreSQL first at 55.6%, then MySQL 40.5%, SQLite 37.5%, Redis 28% and MongoDB 24%. [Data and storage](/blog/data-and-storage) explains why PostgreSQL is the usual default.

## The same layers, different names

The layers in [Inside a backend](/blog/inside-a-backend) exist in every framework. Only the names change. Each cell shows one common way to do it, not the only one.

| Layer | Express (Node.js) | Spring Boot | Django | ASP.NET Core |
| --- | --- | --- | --- | --- |
| Middleware | `app.use(fn)` | A servlet `Filter` or a `HandlerInterceptor` | The `MIDDLEWARE` setting | `app.Use(...)` |
| Routing | `app.get('/orders/:id', handler)` | `@GetMapping("/orders/{id}")` on a controller method | `path('orders/<int:id>/', view)` in `urls.py` | `app.MapGet("/orders/{id}", ...)` or a controller |
| Validation | A library such as Zod | Bean Validation, with `@Valid` | Forms, or serializers in Django REST framework | Data annotations, or a library such as FluentValidation |
| Database access | A library such as Prisma or Drizzle | Spring Data JPA | The built-in Django ORM | Entity Framework Core |
| Background jobs | A queue library such as BullMQ | `@Async`, `@Scheduled`, or a message broker | Celery, or Django 6.0's task API with a worker you run yourself | `BackgroundService`, or a library such as Hangfire |

Use this table when an example in this series is written in Express: the idea carries over, and only the spelling changes.

## When a system is several services: microservices

Everything above assumes one backend. A larger system can instead be split into **microservices**: small services, each running as its own process, deployed on its own and talking to the others over the network. James Lewis and Martin Fowler, whose 2014 article gave the style its common description, list two consequences that matter here.

- **Each service can choose its own stack.** Their examples are Node.js for a simple reports page and C++ for a component with tight real-time demands. They add that being able to do this does not mean you should; the split only gives you the option.
- **Each service owns its data.** They prefer letting each service manage its own database. Another service does not read those tables; it asks through the service's API.

So a mixed stack is an option, not a requirement.

### Is a main API server required?

No. A client can call the services directly, or reach them through one entry point. Microsoft's guide to microservice architecture compares the two.

| Shape | How a client reaches the services | When it fits |
| --- | --- | --- |
| Direct calls | Each service has its own public endpoint | A small system, especially when the client is a server-side web app |
| API gateway | One entry point routes each request to a service, checks credentials, and can combine several services into one response | Mobile apps and single-page apps, many services |
| Backend for frontend (BFF) | One gateway per kind of client, such as one for web and one for mobile | When one gateway serving every client grows too large |

Direct calls have a cost that grows with the number of services. The client must know how the system is split, so changing the split breaks clients. One screen may need several round trips. Every service is exposed to the internet, and each one handles authorization and TLS itself.

A gateway fixes those and adds its own: another part to build and run, an extra network hop, and one more place that can fail for everyone. Its job is routing, checking credentials and combining responses, not business rules. Microsoft's guide warns that a single gateway serving every client tends to grow into a monolith of its own, which is why it suggests one per kind of client. The gateway in [Authentication in practice](/blog/authentication-in-practice) is one example: it turns each outside credential into one internal token.

### Start with one

Fowler's advice is not to start a new project with microservices. He observes that almost every successful microservice story began as a monolith that grew too big and was split. [Full-stack framework or a separate backend](/blog/full-stack-or-separate-backend#when-to-split) shows how to tell when that split is due.

## How to choose

- **Start with what your team already knows.** A team fluent in Spring ships faster with Spring than with a framework it has to learn first.
- **Check who you can hire and what already exists.** A new service usually joins an existing system, and matching it is cheaper than being different.
- **One language on both sides is a real convenience.** With TypeScript on the server, the browser and the backend can share types and validation rules.
- **Raw speed rarely decides it.** Any family on the list can serve ordinary traffic. What changes the outcome is the architecture around it, which the next articles cover.

> [!PRINCIPLE] Core principle
> Pick the stack your team can run and hire for. The architecture you choose next matters more than the language.
