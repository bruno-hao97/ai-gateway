---
title: 'Recipe: Async job + poll'
description: Create job without wait, then poll until resultUrl
---

# Async job + poll loop

Use when you want the job id immediately and poll from your app (or [Playground poll loop](/app/playground/)).

Gommo poll interval: **3500ms**, max **80** attempts (~5 min). Each poll is one `POST` to `/ai/jobs/{id_base}?media=…`.

::: tip Public API
Create: `POST https://v2.api.gommo.net/ai/jobs/image/{model_id}` (form body). Poll: `POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image`. See [Gommo public API](../reference/gommo-public-api.md).
:::

## 1. Create job

Assume `$env:TOKEN`, `$slug`, `$ratio` from [First image job](./image-job-wait.md).

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/x-www-form-urlencoded' }
$body = @{
  access_token = $env:TOKEN
  domain = '79ai.net'
  prompt = 'A cute cat'
  ratio = $ratio
} | ForEach-Object { $_ }

$created = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers $h -Body $body

$jobId = $created.imageInfo.id_base ?? $created.data.id_base ?? $created.id_base
Write-Host "jobId=$jobId"
```

## 2. Poll once

```powershell
$pollBody = @{ access_token = $env:TOKEN; domain = '79ai.net' }
$poll = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
  -Headers $h -Body $pollBody
$poll
```

## 3. Simple loop (PowerShell)

```powershell
$max = 80
$intervalSec = 3.5
for ($i = 1; $i -le $max; $i++) {
  $poll = Invoke-RestMethod -Method POST `
    -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
    -Headers $h -Body $pollBody
  $url = $poll.imageInfo.result_url ?? $poll.data?.resultUrl
  if ($url) { Write-Host "Done: $url"; break }
  Write-Host "Attempt $i — waiting..."
  Start-Sleep -Seconds $intervalSec
}
```

**Poll media:** `image` | `video` | `music` — must match job type.

## Playground

Media job → uncheck **wait** → **Poll job** → **Auto poll (3.5s)**.

## Next

- [Video / music job](./video-music-job.md)
- [Media reference](../reference/media.md)
