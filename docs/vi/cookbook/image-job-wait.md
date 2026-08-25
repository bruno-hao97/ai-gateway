---
title: 'Recipe: Image job đầu tiên (wait)'
description: Login, list models, tạo image job với wait true
---

# Image job đầu tiên (`wait: true`)

Server poll upstream mỗi **3.5s**, tối đa **80** lần — bạn nhận `resultUrl` trong một response.

## 1. Login

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$loginBody = "email=YOU@example.com&password=YOUR_PASSWORD&domain=$domain"
$login = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $loginBody
$env:TOKEN = $login.access_token
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
```

## 2. List models — chọn slug + ratio

```powershell
$models = Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
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
$jobBody = @{
  modelSlug = $slug
  wait = $true
  fields = @{
    prompt = 'A cute cat, studio photo'
    ratio = $ratio
  }
} | ConvertTo-Json -Depth 5

$job = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/image" `
  -Headers $h -Body $jobBody
$job.data.resultUrl
```

## Playground

Connection → List models → **Image job** → bật **wait**.

## Tiếp theo

- [Async job + poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
