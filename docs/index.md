---
layout: home

title: AI Gateway
titleTemplate: false

hero:
  name: AI Gateway
  text: The unified interface for Gommo AI APIs
  tagline: Express TypeScript gateway — transparent proxy + REST wrap (OpenRouter-style API platform)
  actions:
    - theme: brand
      text: Quickstart
      link: /quickstart
    - theme: alt
      text: Models
      link: /models/
    - theme: alt
      text: API Reference
      link: /reference/media
    - theme: alt
      text: Cookbook
      link: /cookbook/
    - theme: alt
      text: Client SDKs
      link: /sdk/
    - theme: alt
      text: OpenAPI
      link: /reference/openapi
    - theme: alt
      text: Playground
      link: http://localhost:3001/portal/playground.html
      target: _blank

features:
  - title: One base URL
    details: Hide v2.api.gommo.net + api.gommo.net behind a single deployable API.
  - title: REST + proxy
    details: Mode B JSON with wait:true polling, or Mode C drop-in Gommo paths.
  - title: Server-side secrets
    details: Merchant token and PayOS keys stay on the gateway — never in the browser.
  - title: Bilingual docs
    details: English and Tiếng Việt — Overview, routing, features, and API reference.
---

## Hard rules (Gommo)

1. **Never guess** `ratio`, `mode`, `resolution`, or `duration` — read from the models list.
2. Jobs are **async** — poll 3.5s, max 80 attempts; no webhook.
3. V2 jobs use `Authorization: Bearer {access_token}`.
4. Merchant token **never** in the browser.

→ [Principles](./principles.md) · [Models & routing](./routing/) · [Deploy](./deploy/)
