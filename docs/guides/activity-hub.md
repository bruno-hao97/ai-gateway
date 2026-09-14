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
| `job` | Job `id_base` | Explore only; opens job detail modal |
| `type` | `image`, `video`, `audio`, `music` | Explore only; filters by job type |
| `q` | Search text | Explore only; filters model/prompt (client-side) |

Examples:

- Overview, 30 days: `/app/activity/`
- Trends, 90 days: `/app/activity/?tab=trends&period=90d`
- Explore one model: `/app/activity/?tab=explore&model=imagegen_2_0&period=30d`
- Explore video jobs: `/app/activity/?tab=explore&type=video&period=30d`
- Search + type: `/app/activity/?tab=explore&type=video&q=cat`
- Open job detail: `/app/activity/?tab=explore&job=JOB_ID_BASE`

Click **Top models** on Overview to jump to Explore with the model filter applied. Use **Copy link** in the job modal to share a `?job=` URL. **Export CSV** on Overview downloads up to 1,000 jobs for the selected period.

## API

Portal charts call gateway wrappers documented in [Usage history](/reference/usage.md):

- `POST /gateway/usage/stats` — aggregates and chart series
- `POST /gateway/usage/logs` — paginated job list
- `POST /gateway/usage/aggregate` — server-side top models (`groupBy=model`)

See also [Billing & credits](./billing-credits.md) and [Authentication](/authentication.md).
