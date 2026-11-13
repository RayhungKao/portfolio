---
title: "全端框架，還是獨立的後端"
---

**你會學到：** 怎麼用兩個獨立的問題描述一個應用程式、由此得出的三種形態，以及什麼時候一個 Next.js 專案就能當你的整個後端。

「我該全部用 Next.js，還是另外做一個後端？」聽起來是一個問題，其實是兩個。把它們混在一起，正是這場爭論永遠沒有結論的原因。

## 兩個軸

第一個軸是**渲染**：HTML 從哪裡來？在單頁應用（SPA）裡，瀏覽器用 JavaScript 建出 HTML。在多頁應用（MPA）裡，伺服器替每個 URL 送出一個完成的頁面。混合型——也就是 Next.js 所在的位置——則依頁面而定，兩種都做。

第二個軸是**部署**：後端和前端在同一個專案裡，還是一個獨立的服務？

| 渲染 | 後端在一起 | 後端分開 |
| --- | --- | --- |
| SPA | 一個 Vite App，由同時提供 API 的 Express 伺服器來提供 | 放在 CDN 上的 React App，呼叫 Java 或 Go 的 API |
| MPA | Rails 或 Django 網站 | 呼叫內部 API 的伺服器渲染網站 |
| 混合型 | Next.js 用 Route Handler 直接和資料庫溝通 | Next.js 呼叫一個共用的 API 服務 |

每一列都能和任一欄組合。選了 Next.js，並不代表後端要不要分開。

## 三種形態

![Three common application shapes](diagram:three-application-shapes)

**A. Next.js 包辦一切。** 一個專案裡有頁面和 API，直接和資料庫溝通。一個小團隊就能自己交付。

**B. Next.js 加上獨立後端。** Next.js 仍然渲染頁面，但商業邏輯放在另一個服務裡。在這種形態中，Next.js 常扮演 **BFF**（backend for frontend）：一個只為這個前端存在的薄伺服器。它從多個服務收集資料、整理成畫面需要的形狀，並對瀏覽器隱藏內部位址和金鑰。

**C. 前後端分離。** 靜態前端放在 CDN 上，瀏覽器直接呼叫 API 伺服器。API 可以用任何語言寫。

## Next.js 在伺服器端給你什麼

有四個零件讓形態 A 成為可能。

- **Server Component** 在伺服器上渲染，可以直接讀取資料庫，所以頁面自己的資料不需要呼叫 API。
- **Route Handler**（`app/api/.../route.ts`）是一般的 HTTP endpoint，例如 `POST /api/orders`。
- **Server Action** 是你從表單或元件呼叫的函式。底層每一個都是一個內部的 POST endpoint，這表示任何找到它的人都能呼叫它，所以每個 action 都必須自己檢查使用者。
- **`proxy.ts`** 在路由比對之前執行，用來做粗略的關卡，例如把沒有 session 的訪客重新導向。

在靜態匯出（static export）中，這些都無法在請求當下運作。這個作品集用 `output: 'export'` 建置，結果是一個資料夾的檔案，執行時沒有伺服器。Server Component 只在建置時跑一次。Route Handler 只能在建置時產生固定的 `GET` 回應。Server Action 和 `proxy.ts` 完全不支援。如果你需要這四者中任何一個對即時請求做出反應，就需要一個會跑 Node 的主機。完整清單在 [Static export: server code runs only at build time](/blog/static-export-and-build-time)。

## 什麼時候一個專案就夠了

以下情況選形態 A：

- 一個小團隊同時交付兩端。這時改一個欄位只要改一個 repository，型別檢查會同時抓到兩端。
- 只有一個網頁用戶端，沒有手機 App 需要同一套 API。
- 你在做 MVP，想要最少的活動零件。

## 什麼時候該拆開

以下情況選 B 或 C：

- **不只一個用戶端**需要同一套規則。網頁 App、iOS App 和合作夥伴整合不該各自重新實作一次計價邏輯。
- **已經有一個用其他語言工作的後端團隊**，例如 Go 或 Java，而你想維持現狀。
- **後端需要長連線或大量運算**，例如 WebSocket 聊天或影片處理，這些比較適合長時間執行的伺服器，而不是 function。
- **各部分必須獨立擴展或發布。** 結帳服務部署時，不應該連帶重新部署行銷網站。

一條實用的中間路線是：從 A 開始，讓程式碼告訴你什麼時候該拆。如果你的 Route Handler 一直呼叫同一個 service 模組，那個模組就已經是未來的後端了。

> [!NOTE] 其他內容在哪裡
> Server Action 和 Route Handler 細部的差異，在[前端系列](/series/web-frontend)的 [Server and client components](/blog/server-and-client-components) 裡。

> [!PRINCIPLE] 核心原則
> 渲染回答 HTML 從哪裡來，部署回答後端是否分開。它們是兩個獨立的軸。
