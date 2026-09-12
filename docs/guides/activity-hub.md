---
title: Activity hub
description: Usage analytics, job explore, and billing in the developer portal
---

# Activity hub

Open **[Activity](/app/activity/)** in the portal for usage analytics (same Gommo `usage-history` data as Profile preview).

## Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | KPIs, charts, top models, recent jobs |
| **Trends** | Credits/outcome charts + daily summary table |
| **Explore** | Searchable job log; click a row for details |
| **Billing** | Top-up orders and quick links to Credits |

## URL query params

Share or bookmark a view with query parameters:

| Param | Values | Default |
|-------|--------|---------|
| `tab` | `trends`, `explore`, `billing` | Overview (omit param) |
| `period` | `7d`, `30d`, `90d` | `30d` |
| `model` | Model slug | Explore only; filters job list |

Examples:

- Overview, 30 days: `/app/activity/`
- Trends, 90 days: `/app/activity/?tab=trends&period=90d`
- Explore one model: `/app/activity/?tab=explore&model=imagegen_2_0&period=30d`

Click **Top models** on Overview to jump to Explore with the model filter applied.

## API

Portal charts call gateway wrappers documented in [Usage history](/reference/usage.md):

- `POST /gateway/usage/stats` — aggregates and chart series
- `POST /gateway/usage/logs` — paginated job list
- `POST /gateway/usage/aggregate` — server-side top models (`groupBy=model`)

See also [Billing & credits](./billing-credits.md) and [Authentication](/authentication.md).
