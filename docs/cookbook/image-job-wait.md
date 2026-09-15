---
title: 'Recipe: First image job (wait)'
description: Login, list models, create image job, poll until resultUrl
---

# First image job (poll until done)

Create an image job on the public API, then poll every **3.5s**, max **80** attempts (~5 min) — same timing as gateway `wait: true`.

## 1. Login

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$loginBody = "email=YOU@example.com&password=YOUR_PASSWORD&domain=$domain"
$login = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $loginBody
$env:TOKEN = $login.access_token
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/x-www-form-urlencoded' }
```

## 2. List models — pick slug + ratio

```powershell
$models = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "type=image&domain=$domain"
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
$body = "domain=$domain&project_id=default&prompt=A cute cat, studio photo&ratio=$ratio"
$created = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers $h -Body $body
$jobId = $created.imageInfo.id_base ?? $created.data.id_base ?? $created.id_base
```

## 4. Poll until `resultUrl`

```powershell
$pollBody = "access_token=$env:TOKEN&domain=$domain"
for ($i = 1; $i -le 80; $i++) {
  $poll = Invoke-RestMethod -Method POST `
    -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
    -Headers $h -Body $pollBody
  $url = $poll.imageInfo.result_url ?? $poll.data?.resultUrl
  if ($url) { Write-Host "Done: $url"; break }
  Start-Sleep -Seconds 3.5
}
```

## Playground

Connection → List models → **Image job** → Run with **wait** checked (proxies poll via local gateway in dev).

## Optional: gateway `wait: true`

Self-hosted gateway: `POST /gateway/jobs/image` with JSON `{ "modelSlug", "wait": true, "fields": { … } }`. See [Integration modes](../routing/integration-modes.md).

## Next

- [Async job + poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
