---
title: "Authentication in practice: verifying Firebase tokens, gateways and refresh tokens"
date: 2026-10-18
summary: "Verify a Firebase token in your own API, turn mixed credentials into one internal JWT, and keep sessions alive with refresh tokens."
series: web-backend
order: 403
part: Backend in code
draft: true
---

**What you'll learn:** how to verify a Firebase token on your own backend, how a gateway turns different credentials into one internal token, and how refresh tokens work.

[Authentication: session vs JWT](/blog/authentication-session-vs-jwt) explains the tokens. This article covers three real arrangements.

## Firebase for login, your own API for data

Suppose login is Firebase Auth, but your data lives behind your own API. The browser signs in with Firebase and receives an **ID token**, a JWT signed by Google. It sends the token to your API in a header. Your API must verify it, because the header can be forged by anyone.

```ts
import { getAuth } from 'firebase-admin/auth'

// middleware: turn "Authorization: Bearer <token>" into a user, or stop with 401
export async function requireUser(req, res, next) {
  const header = req.headers.authorization ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!idToken) return res.status(401).json({ error: 'login required' })

  try {
    const decoded = await getAuth().verifyIdToken(idToken) // checks format, expiry and signature
    req.user = { id: decoded.uid }
    next()
  } catch {
    res.status(401).json({ error: 'invalid or expired token' })
  }
}
```

`verifyIdToken` confirms that the token is well formed, not expired and signed by Firebase. It does not check whether the token was revoked, so a user you disabled keeps working until the token expires. If you need to cut someone off at once, pass `true` as the second argument so it also checks revocation, at the cost of a network lookup on each call. From here on your code uses `req.user.id`, and your database never needs to know Firebase exists.

## A gateway that turns mixed credentials into one

A company may have a web app that uses a session cookie, a mobile app that uses a bearer token, and several services behind them. Making every service understand both is a mess. Instead, a **gateway** (or backend-for-frontend, BFF) sits in front.

![A gateway checks outside credentials and passes an internal JWT to services](diagram:mixed-credentials-gateway)

The gateway checks whatever the outside client brought, then calls the services with one **internal JWT** that only the gateway can issue. Each service verifies that internal token and nothing else.

| Part | Responsibility | Example |
| --- | --- | --- |
| Gateway | Understands outside credentials, issues the internal token | Reads the cookie, looks up the session, issues a JWT with `sub` and `roles` that expires in 60 seconds |
| Services | Trust only the internal token | Verify the signature, then read `roles` |

Two rules keep this safe. Make the internal token short-lived, since it never needs to last, and make sure the services are not reachable from the internet except through the gateway. If they were, someone could skip the gateway and send a token of their own.

## Refresh tokens

A short-lived token limits the damage of a theft, but nobody wants to log in every fifteen minutes. The answer is two tokens.

| Token | Lifetime | Used for | Stored |
| --- | --- | --- | --- |
| Access token | Minutes (a Firebase ID token lasts about an hour) | Sent with every API call | In memory, or an `HttpOnly` cookie |
| Refresh token | Days or weeks | Only to get a new access token | In an `HttpOnly` cookie or the system's secure storage |

When an access token expires, the client sends the refresh token to the auth endpoint and gets a new access token. Firebase's client SDK does this for you in the background.

Because a refresh token lives long, it needs more care than the access token:

- **Rotation.** Each use returns a new refresh token and invalidates the old one.
- **Reuse detection.** If an already-used refresh token arrives again, someone has a copy. Revoke the whole chain and make the user log in again.
- **Server-side record.** Keep refresh tokens (or their hashes) in a table so you can revoke them. This is where the revocation list from the session-versus-JWT discussion lives.

> [!PRINCIPLE] Core principle
> Verify every token yourself, let one gateway translate outside credentials into one inside token, and make the long-lived token the one you can revoke.
