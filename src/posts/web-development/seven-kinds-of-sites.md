---
title: "Start with the need: seven common kinds of sites"
date: 2026-10-18
summary: "Content sites, portfolios, shops, social apps, dashboards, SaaS and creator tools each ask for different things from a stack."
series: web-development
order: 201
part: Needs to architecture
draft: false
---

**What you'll learn:** what content sites, portfolios, shops, social apps, dashboards, SaaS tools and creator tools each need, and the four questions whose answers change the architecture.

Whether a tool is a good choice depends on what the site has to do. "Build a website" can mean a ten-page portfolio or a design editor, and those two share almost nothing.

![Seven site types placed on two axes of need](diagram:site-types-two-axes)

The positions are typical, not strict. Moving right means the content depends more on each visitor. Moving up means more interaction after the page has loaded.

## Seven kinds of sites

| Type | What it is | Example | What it cares about most |
| --- | --- | --- | --- |
| Content site | Articles and information: blogs, documentation, news | Wikipedia | SEO, load speed |
| Portfolio / marketing page | A few pages that show work or introduce a product | Apple's product pages | First impression, link previews when shared |
| E-commerce | Product pages, cart, checkout | Amazon | SEO, fresh stock and prices, reliability |
| Social / media | Feeds, video, comments | Instagram | Personalized content, scale, SEO for public pages |
| Dashboard / admin | Management screens and reports | Google Analytics | Interaction and permissions (SEO does not matter) |
| SaaS application | Collaboration and workflow tools | Notion | Interaction, live updates, permissions |
| Creator tool | Image or video editors, canvas apps | Figma | Heavy interaction, computing in the browser |

A content site is not the same as a CMS. A headless CMS such as Sanity is a back-office service for editing and storing content, and content sites often use one as a data source. "Content site" describes the website itself, whose main job is articles and information.

## Four questions that change the architecture

1. **Does it need to be found by search engines, or show a preview when a link is shared?** A blog post does. A page behind a login does not.
2. **Is the content known at build time, or only known when a request arrives?** A documentation page is known in advance. A product page showing today's stock is not.
3. **How heavy is the interaction after load?** A form is light. A canvas editor with live updates is heavy.
4. **Does anything need to happen on a server?** A database, a login or a payment API does. A portfolio that only shows pictures does not.

Together, the answers decide the rendering mode, which the next article covers. The first two decide when and where the HTML is produced: at build time, on a server, or in the browser. The third decides how much work stays in the browser, and the fourth decides whether you need a backend at all. [From needs to architecture](/blog/from-needs-to-architecture) puts them in one flow.

> [!PRINCIPLE] Core principle
> State the need first. Only then does a tool choice have something to be judged against.
