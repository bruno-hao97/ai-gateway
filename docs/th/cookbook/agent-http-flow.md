---
title: 'Recipe: Agent HTTP flow'
description: HTTP loop ขั้นต่ำสำหรับ scripts และ LLM agents
---

# Agent HTTP flow

loop **Gommo public API** ขั้นต่ำสำหรับ automation — ไม่ต้องใช้ MCP

## Flow

```mermaid
flowchart LR
  A[Login or token] --> B[POST v2…/ai/models]
  B --> C[POST v2…/ai/jobs/type/slug]
  C --> D[POST v2…/ai/jobs/id poll]
  D --> E[result URL]
```

## Script skeleton (PowerShell)

```powershell
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$h = @{ Authorization = "Bearer $env:TOKEN" }

# 1. Catalog
$models = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=image" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=image&domain=$d"
$m = $models.data[0]
$slug = $m.model ?? $m.slug
$ratio = $m.ratios[0]
if ($ratio -is [pscustomobject]) { $ratio = $ratio.value }

# 2. Create job
$job = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "domain=$d&project_id=default&prompt=A red apple&ratio=$ratio"

# 3. Poll (simplified)
$jobId = $job.imageInfo.id_base
for ($i = 1; $i -le 80; $i++) {
  $poll = Invoke-RestMethod -Method POST `
    -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
    -Headers $h -ContentType "application/x-www-form-urlencoded" `
    -Body "domain=$d&project_id=default"
  $url = $poll.imageInfo.result_url
  if ($url) { Write-Host $url; break }
  Start-Sleep -Seconds 3.5
}
```

## จัดการข้อผิดพลาด

Gommo คืน JSON พร้อม `success`, `message`, `error` — agents ควรอ่านก่อน retry

## MCP vs HTTP

Cursor **MCP tools** (`gommo_*`) แยกจาก HTTP gateway production ใช้ HTTP public API — ดู [MCP & agents](../mcp/)

## ถัดไป

- [งานรูปแรก](./image-job-wait.md)
- [Best practices](../best-practices/index.md)
