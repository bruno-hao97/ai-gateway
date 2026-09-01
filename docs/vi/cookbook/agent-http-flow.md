---
title: 'Recipe: Agent HTTP flow'
description: Vòng lặp HTTP tối thiểu cho script và LLM agent
---

# Agent HTTP flow

Vòng **Mode B** tối thiểu cho automation — không cần MCP.

## Flow

```mermaid
flowchart LR
  A[Login hoặc token] --> B[GET /gateway/models]
  B --> C[POST /gateway/jobs/type]
  C --> D{wait?}
  D -->|true| E[resultUrl trong response]
  D -->|false| F[GET /gateway/jobs/id]
  F --> E
```

## Script skeleton (PowerShell)

```powershell
$base = 'http://localhost:3001'
# 1. Token — login hoặc $env:TOKEN
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }

# 2. Catalog
$models = Invoke-RestMethod "$base/gateway/models?type=image" -Headers @{ Authorization = "Bearer $env:TOKEN" }
$m = $models.data[0]
$slug = $m.model ?? $m.slug
$ratio = $m.ratios[0]
if ($ratio -is [pscustomobject]) { $ratio = $ratio.value }

# 3. Job
$job = Invoke-RestMethod -Method POST -Uri "$base/gateway/jobs/image" -Headers $h -Body (@{
  modelSlug = $slug; wait = $true
  fields = @{ prompt = 'A red apple'; ratio = $ratio }
} | ConvertTo-Json -Depth 5)

# 4. Output
$job.data.resultUrl
```

## Xử lý lỗi

Gateway trả `{ "success": false, "message": "...", "code": "..." }` — agent nên đọc `code` trước khi retry.

Code thường gặp: `VALIDATION_ERROR`, `UNAUTHORIZED`, `UPSTREAM_ERROR`.

## MCP vs HTTP

**MCP tools** Cursor (`gommo_*`) tách biệt với gateway này. Production integration dùng HTTP — xem [MCP & agents](../mcp/).

## Tiếp theo

- [Image job đầu tiên](./image-job-wait.md)
- [Best practices](../best-practices/index.md)
