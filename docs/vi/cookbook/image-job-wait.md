---
title: 'Recipe: Image job đầu tiên'
description: Login, list models, tạo image job và poll
---

# Image job đầu tiên

Flow **Gommo public API** — list models, create job, poll client-side.

::: tip Gateway tùy chọn (dev)
Self-host gateway có `wait: true` — một HTTP round-trip. Production: poll client như dưới.
:::

## 1. Login

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$loginBody = "email=YOU@example.com&password=YOUR_PASSWORD&domain=$domain"
$login = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $loginBody
$env:TOKEN = $login.access_token
$h = @{ Authorization = "Bearer $env:TOKEN" }
```

## 2. List models — chọn slug + ratio

```powershell
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$models = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=image" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "type=image&domain=$d"
$m = $models.data[0]
$slug = $m.model ?? $m.slug
$ratio = $m.ratios[0]
if ($ratio -is [pscustomobject]) { $ratio = $ratio.value }
Write-Host "model=$slug ratio=$ratio"
```

::: warning
Chỉ dùng giá trị từ response catalog.
:::

## 3. Tạo job

```powershell
$body = "domain=$d&project_id=default&prompt=A cute cat, studio photo&ratio=$ratio"
$job = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
$jobId = $job.imageInfo.id_base ?? $job.data.id_base
Write-Host "jobId=$jobId"
```

## 4. Poll đến hoàn thành

Xem [Job async + poll](./job-poll-async.md) — interval **3.5s**, max **80** lần.

## Playground

Connection → List models → **Image job** → Run.

## Tiếp theo

- [Async job + poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
