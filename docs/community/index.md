---
title: Community
description: GitHub, issues, contributions, and support channels
---

# Community

AI Gateway is an open developer docs + API platform project. The primary community channel today is **GitHub**.

## Repository

**[github.com/bruno-hao97/ai-gateway](https://github.com/bruno-hao97/ai-gateway)**

Clone and run locally:

```bash
git clone https://github.com/bruno-hao97/ai-gateway.git
cd ai-gateway
cp .env.example .env
npm install
npm run dev
```

## GitHub Issues

Use Issues for:

| Type | Label / title hint |
|------|-------------------|
| Bug in gateway API | `bug` — include repro steps |
| Docs wrong or missing | `documentation` — link to doc page |
| Feature request | `enhancement` — describe use case |
| Upstream Gommo behavior | Note **direct vs gateway** comparison |
| Security concern | **Do not** paste secrets — see below |

**Open an issue:** [github.com/bruno-hao97/ai-gateway/issues/new](https://github.com/bruno-hao97/ai-gateway/issues/new)

Before opening, check [Report feedback](./../report-feedback.md) for the info we need.

## Pull requests

Docs improvements are welcome — especially:

- VitePress pages under `docs/` and `docs/vi/`
- API reference accuracy against `src/routes/`
- Examples (curl, PowerShell) that match [Quickstart](./../quickstart.md)

1. Fork → branch → edit markdown
2. `npm run docs:build` must pass
3. Open PR with **what page** and **why**

Code changes to `src/` should include a short test plan (curl or script path).

## Discussions

No official Discord or forum yet. For now:

- **Questions** → GitHub Issue with `question` (or Discussions if enabled on the repo)
- **Integrator chat** → your own team channels

If the repo enables [GitHub Discussions](https://docs.github.com/en/discussions), prefer that for open-ended Q&A; keep Issues for actionable bugs.

## What we do not support here

| Topic | Where |
|-------|--------|
| End-user studio / site-ai UI | Out of scope — API platform only |
| Cursor MCP `gommo_*` runtime | IDE tooling — see [MCP & agents](../mcp/) |
| Gommo account billing disputes | Gommo support / your merchant admin |

## Security reports

Do **not** open public issues with live tokens. Email or private security advisory (if configured on GitHub) with:

- Steps to reproduce
- Impact assessment
- Redacted logs only

General hygiene → [Privacy & security](./../privacy/).

## Stay updated

- Watch the repo on GitHub for releases and doc updates
- Docs site: build from `docs/` via `npm run docs:dev` or deployed static host

## Related

→ [Report feedback](./../report-feedback.md) · [FAQ](./../faq.md) · [Deploy & ops](./../deploy/)
