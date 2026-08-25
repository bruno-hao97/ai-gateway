---
title: 'Recipe: First image job (wait)'
description: Login, list models, create image job with wait true
---

# First image job (`wait: true`)

Server polls upstream every **3.5s**, max **80** attempts — you get `resultUrl` in one response.

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

## 2. List models — pick slug + ratio

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
Use **only** values from the catalog response.
:::

## 3. Create job

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

Connection → List models → **Image job** → Run with **wait** checked.

## Next

- [Async job + poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
