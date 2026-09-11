---
title: Changelog
description: Documentation and platform updates for AI Gateway
---

# Changelog

Notable changes to the docs site, portal, and gateway REST surface.

## 2026-03-11

### Docs

- Local search, **Edit on GitHub**, and GitHub link in the nav bar
- ASCII routing diagrams on [Principles](./principles.md) and [Routing](./routing/) (Mermaid removed — `fastdom` ESM conflict in dev)
- **Choose your path** section on [Quickstart](./quickstart.md)
- Prose styling for tables, callouts, and code blocks

### Playground (portal)

- Request tab: full public URL, JSON body preview, response structure samples
- Tab pinning during job poll (stay on Request / Endpoints while polling)

---

::: info Upstream dependency
Media jobs, catalog, and login require **Gommo public API** (`v2.api.gommo.net`, `api.gommo.net`). When upstream is down, docs and UI still work; live API calls will fail until service recovers.
:::
