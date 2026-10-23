---
title: "Authentication: session vs JWT"
date: 2026-10-18
summary: Two ways for a server to remember who you are, how cookies and headers carry them, and which tools to reach for.
series: web-backend
order: 104
part: How a backend works
draft: false
---

**What you'll learn:** the two ways a server can remember a logged-in user, how each one behaves when you log out or add servers, and what the attributes on a login cookie protect against.

HTTP has no memory. Each request arrives alone, and the server cannot tell that the request for `/cart` comes from the same person who logged in a minute ago. Authentication solves this by handing the browser something to show on every request. There are two kinds of "something".

![Session and JWT login flows](diagram:session-vs-jwt-flows)

## Opaque token or self-contained token

A **session** gives the browser a random ID such as `9f3a…`. The ID means nothing by itself. The user's data stays on the server in a session store, and each request makes the server look the ID up.

A **JWT** (JSON Web Token) is a token that carries the data inside it: the user ID, the expiry, sometimes a role. The server signs it with a secret key. On each request the server checks the signature and trusts what is inside, with no lookup.

| | Session | JWT |
| --- | --- | --- |
| Where the user data lives | In a store on the server (Redis, a database) | Inside the token the browser holds |
| Work per request | One store lookup | Verify a signature, no lookup |
| Logout and revoking | Delete the record and the user is out at once | The token stays valid until it expires |
| Several servers | Every server must reach the same store | Every server only needs the key |
| Strongest when | You must kick a user out immediately, such as a banking site or an admin panel | Many services or servers need to check identity without sharing a database |

The weakness of the JWT is revocation. A stolen token works until it expires, so the usual answer is a short expiry plus a revocation list for the cases where you must cut a user off at once. That list is a store lookup again, which is a fair sign that neither side is free.

## How the token travels is a separate choice

People often say "sessions use cookies and JWTs use headers". That is a habit, not a rule. A cookie or an `Authorization` header can carry either kind.

- A **browser** stores cookies and sends them back automatically, which is why cookies suit websites.
- A **mobile app** has no cookie jar by default. It keeps the token in the system's secure storage, the iOS Keychain or the Android Keystore, and adds it to the `Authorization` header itself.

Choose the token type by how you need to revoke and scale. Choose the transport by what the client is.

## What the cookie attributes defend against

A login cookie is worth stealing, so it is set with three attributes:

```http
Set-Cookie: sid=9f3a…; HttpOnly; Secure; SameSite=Lax
```

| Attribute | What it does | The threat it addresses |
| --- | --- | --- |
| `HttpOnly` | JavaScript cannot read the cookie. | A cross-site scripting bug that tries to copy the session ID out of `document.cookie`. |
| `Secure` | The cookie is sent only over HTTPS. | Someone on the same café Wi-Fi reading a plain-HTTP request. |
| `SameSite=Lax` | The cookie is not sent on most cross-site requests. | Another site tricking the browser into submitting a form to yours while you are logged in (CSRF). |

## Login, then permission

Authentication answers "who are you?", and authorisation answers "may you do this?". They fail with different codes: 401 when the server does not know who you are, 403 when it knows and refuses.

Real systems often mix the pieces. A store can use Firebase Auth only for login and verify its token in its own API. A company can keep a gateway that checks the outside credential, then issues an internal JWT for the services behind it. The next articles come back to both shapes.

## Tools, so you do not build login yourself

Writing your own login is a classic way to introduce security bugs. As of October 2026 the common choices are:

- **Better Auth**, a library you run in your own app, with your own database.
- **Clerk**, a hosted service with prebuilt sign-in screens.
- **Supabase Auth** and **Firebase Auth**, which come with their platform.
- **Auth.js** (formerly NextAuth), whose maintenance moved to the Better Auth team. It still gets security patches, and the team recommends Better Auth for new projects.

> [!PRINCIPLE] Core principle
> A session is an opaque token and the data stays with the server; a JWT is a self-contained token. Cookie versus header is a separate choice, made by the kind of client.
