---
title: "全端框架，還是獨立的後端"
---

**你會學到：** 怎麼用兩個彼此獨立的問題來描述一個應用程式、由此分出的三種架構，以及什麼時候一個 Next.js 專案就足以當你全部的後端。

「我該全部用 Next.js，還是另外做一個後端？」聽起來是一個問題，其實是兩個。這兩個問題混在一起，這種討論才會永遠吵不出結論。

## 兩個面向

第一個面向是**渲染**：HTML 是在哪裡產生的？單頁應用（SPA）是由瀏覽器用 JavaScript 產生 HTML；多頁應用（MPA）是由伺服器替每個 URL 送出一個完整的頁面；混合型則看頁面決定，兩種都用，Next.js 就是這一種。

第二個面向是**部署**：後端跟前端放在同一個專案裡，還是另外做成一個獨立的服務？

| 渲染 | 後端放在一起 | 後端分開 |
| --- | --- | --- |
| SPA | 一個 Vite App，由一台同時提供 API 的 Express 伺服器負責提供 | 放在 CDN 上的 React App，呼叫用 Java 或 Go 寫的 API |
| MPA | Rails 或 Django 網站 | 由伺服器產生頁面的網站，再去呼叫內部的 API |
| 混合型 | Next.js 用 Route Handler 直接存取資料庫 | Next.js 呼叫一個共用的 API 服務 |

每一列都能搭配任一欄。選了 Next.js，不代表就決定了後端要不要分開。

## 三種架構

![Three common application shapes](diagram:three-application-shapes)

**A. Next.js 包辦全部。** 同一個專案裡有頁面也有 API，直接存取資料庫。一個小團隊自己就能做完、上線。

**B. Next.js 加上一個獨立的後端。** 頁面還是由 Next.js 產生，但商業邏輯放在另一個服務裡。這種架構裡，Next.js 常扮演 **BFF**（backend for frontend）：一個只為這個前端服務的輕量伺服器。它向好幾個服務拿資料、整理成畫面需要的樣子，同時不讓瀏覽器看到內部的位址和金鑰。

**C. 前後端完全分開。** 靜態的前端放在 CDN 上，瀏覽器直接呼叫 API 伺服器。API 用什麼語言寫都可以。

## Next.js 在伺服器端提供了什麼

架構 A 能成立，靠的是這四樣東西：

- **Server Component** 在伺服器上產生畫面，可以直接讀資料庫，所以頁面自己要用的資料不必再呼叫 API。
- **Route Handler**（`app/api/.../route.ts`）是一般的 HTTP endpoint，例如 `POST /api/orders`。
- **Server Action** 是可以直接從表單或元件呼叫的函式。它的底層其實是一個內部的 POST endpoint，任何人只要找到它就能呼叫，所以每個 action 都要自己檢查使用者身分。
- **`proxy.ts`** 在路由比對之前執行，可以當作粗略的第一道關卡，例如把沒有 session 的訪客 redirect 走。

如果用 static export，這四樣都沒辦法在請求進來時運作。這個作品集是用 `output: 'export'` 建置的，產出的就是一個資料夾的檔案，上線後沒有伺服器在跑。Server Component 只在建置時跑一次；Route Handler 只能在建置時產生固定的 `GET` 回應；Server Action 和 `proxy.ts` 則完全不能用。只要其中任何一個需要即時回應請求，你就需要一台能跑 Node 的主機。完整的清單請見 [Static export: server code runs only at build time](/blog/static-export-and-build-time)。

## 什麼時候一個專案就夠了

以下情況選架構 A：

- 一個小團隊同時負責前後端。這時改一個欄位只要改一個 repository，型別檢查也會同時抓出前後端的問題。
- 只有一個網頁 client，沒有手機 App 要用同一套 API。
- 你在做 MVP，希望要維護的東西越少越好。

## 什麼時候該拆開

以下情況選 B 或 C：

- **不只一個 client** 要用同一套規則。網頁 App、iOS App 和合作夥伴的串接，不該各自再寫一次計價邏輯。
- **已經有一個用其他語言的後端團隊**，例如用 Go 或 Java，而你不打算改變。
- **後端需要長時間的連線或大量運算**，例如 WebSocket 聊天或影片處理，這些比較適合一直在跑的伺服器，不適合 function。
- **各部分要能分開擴充、分開上線。** 結帳服務更新時，不應該連行銷網站都要一起重新部署。

一個實際的折衷做法是：先用 A，讓程式碼告訴你什麼時候該拆。如果你的 Route Handler 一直在呼叫同一個 service 模組，那個模組其實就是你未來的後端了。

> [!NOTE] 其他相關內容
> Server Action 和 Route Handler 更細的差別，請見[前端系列](/series/web-frontend)的 [Server and client components](/blog/server-and-client-components)。

> [!PRINCIPLE] 核心原則
> 渲染決定 HTML 在哪裡產生，部署決定後端要不要分開。這是兩個互不相干的問題。
