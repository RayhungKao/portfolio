---
title: Data and storage
date: 2026-10-18
summary: Database, cache and object storage, the seven kinds of database, and the relational basics that PostgreSQL gives you by default.
series: web-development
order: 605
part: How a backend works
draft: false
---

**What you'll learn:** the three kinds of storage a backend uses, a map of seven database types, and enough relational vocabulary to read a table design.

A backend does not keep everything in one place. It puts each piece of data where its shape and its access pattern fit best.

![Three kinds of storage behind a backend](diagram:three-kinds-of-storage)

| Storage | What goes in | Why it fits | Example |
| --- | --- | --- | --- |
| Database | Structured data you query and must not lose | Queries, relations and constraints | Users, orders and stock in PostgreSQL. |
| Cache | Temporary data that can be recomputed | Very fast reads from memory, safe to lose | Login sessions and the "top 10 products" list in Redis. |
| Object storage | Large files read as a whole | Cheap, huge, served by URL | Product photos and uploaded videos in S3. |

The test for the cache is simple: if it vanished tomorrow, could you rebuild it? If not, it belongs in the database.

## Seven kinds of database

"Database" covers several different tools. Each one is built around a shape of data.

| Type | Shape of data | Product | A scenario |
| --- | --- | --- | --- |
| Relational | Tables with rows that refer to each other | PostgreSQL, MySQL | Orders, customers, products. |
| Document | Nested JSON-like records | MongoDB, Firestore | A mobile chat app whose messages have varying fields. |
| Key-value | One value per key, very fast | Redis, DynamoDB | A session store, a rate-limit counter. |
| Search | Text, ranked by relevance | Elasticsearch, Meilisearch | A search box that forgives typos. |
| Time-series | Measurements ordered by time | TimescaleDB, InfluxDB | Server metrics, sensor readings. |
| Graph | Items and their connections | Neo4j | "Friends of friends" recommendations. |
| Vector | Numbers that describe meaning | pgvector, Pinecone | Finding similar documents for an AI assistant. |

## Why PostgreSQL is the usual default

If your needs are not special, start with PostgreSQL. Many teams treat it as the default for new web projects, and the reasons are practical. It is relational, so it handles the structured data most apps have. It has strong transactions, covered in the next article. It also grows sideways: JSON columns cover document-style data, and extensions such as pgvector and PostGIS cover vectors and maps. Most projects never outgrow it, and a project that does can move one workload out later.

## Relational basics

A relational database stores data in **tables**. A table has **columns** (the fields, the *schema*) and **rows** (one record each). Every row has a **primary key** (PK), a value that is unique to it. A UUID such as `7c9e…` is a good choice, because a client can create one while offline and the server will accept it later without a clash.

A **foreign key** (FK) is a column that holds another row's primary key. That is how tables point at each other. A store needs four tables:

![Online store tables and their relationships](diagram:ecommerce-erd)

Why split into tables instead of one big sheet? If each order stored the customer's name and address, a change of address would mean editing every order. With a `users` table, the order holds a `user_id` and the address lives in one place.

The relationships come in two kinds. **One-to-many**: one user has many orders, and each order belongs to one user. **Many-to-many**: an order contains many products, and a product appears in many orders. A many-to-many link needs a **join table**, which here is `order_items`, one row per product in an order.

Two statements show the idea. The first creates the join table, and the second reads an order with its products:

```sql
CREATE TABLE order_items (
  id         uuid PRIMARY KEY,
  order_id   uuid NOT NULL REFERENCES orders(id),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity   int  NOT NULL CHECK (quantity > 0)
);

SELECT p.name, i.quantity FROM order_items i
JOIN products p ON p.id = i.product_id WHERE i.order_id = $1;
```

`JOIN` stitches rows from two tables together through the key. `REFERENCES` makes the database reject an order item that points to a product that does not exist. `CHECK` is a constraint, a rule the database enforces for you: a quantity must be positive, and on the products table `CHECK (stock >= 0)` means stock can never go negative, whatever your code does. Constraints are the last line of defence when a bug slips past the layers above.

> [!NOTE] Not covered here
> The full four-table schema, normalization, indexes and migrations are beyond this series. Your database's own documentation is the place to go next.

> [!PRINCIPLE] Core principle
> Data goes into different stores by its shape and access pattern. Without a special need, PostgreSQL is the common default.
