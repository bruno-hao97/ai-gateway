---
layout: home

title: AI Gateway
titleTemplate: false

hero:
  name: AI Gateway
  text: Giao diện thống nhất cho Gommo AI APIs
  tagline: Gateway Express TypeScript — proxy trong suốt + REST wrap (nền tảng API kiểu OpenRouter)
  actions:
    - theme: brand
      text: Quickstart
      link: /vi/quickstart
    - theme: alt
      text: API Reference
      link: /vi/reference/media
    - theme: alt
      text: Cookbook
      link: /vi/cookbook/
    - theme: alt
      text: Client SDKs
      link: /vi/sdk/
    - theme: alt
      text: OpenAPI
      link: /vi/reference/openapi
    - theme: alt
      text: Playground
      link: http://localhost:3001/portal/playground.html
      target: _blank

features:
  - title: Một base URL
    details: Ẩn v2.api.gommo.net + api.gommo.net sau một API deploy được.
  - title: REST + proxy
    details: Mode B JSON với wait:true, hoặc Mode C drop-in path Gommo.
  - title: Secret phía server
    details: Merchant token và PayOS key ở gateway — không đưa vào browser.
  - title: Docs song ngữ
    details: English và Tiếng Việt — overview, routing, features, API reference.
---

## Quy tắc cứng (Gommo)

1. **Không đoán** `ratio`, `mode`, `resolution`, `duration` — lấy từ models list.
2. Job **async** — poll 3.5s, tối đa 80 lần; không webhook.
3. V2 jobs dùng `Authorization: Bearer {access_token}`.
4. Merchant token **không bao giờ** ở browser.

→ [Nguyên tắc](./principles.md) · [Models & routing](./routing/) · [Deploy](./deploy/)
