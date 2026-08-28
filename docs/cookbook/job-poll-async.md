---
title: 'Recipe: Async job + poll'
description: Create job without wait, then poll until resultUrl
---

# Async job + poll loop

Use when you want the job id immediately and poll from your app (or [Playground poll loop](/app/playground/)).

Gateway poll interval upstream: **3500ms**, max **80** attempts when using `wait: true` on create. Manual poll = one status check per `GET`.

## 1. Create job (`wait: false`)

Assume `$env:TOKEN`, `$slug`, `$ratio` from [First image job](./image-job-wait.md).

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$jobBody = @{
  modelSlug = $slug
  wait = $false
  fields = @{ prompt = 'A cute cat'; ratio = $ratio }
} | ConvertTo-Json -Depth 5

$created = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/image" `
  -Headers $h -Body $jobBody

$jobId = $created.data.id_base ?? $created.data.jobId ?? $created.raw.imageInfo.id_base
Write-Host "jobId=$jobId"
```

## 2. Poll once

```powershell
$poll = Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/jobs/$jobId?media=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$poll
```

## 3. Simple loop (PowerShell)

```powershell
$max = 80
$intervalSec = 3.5
for ($i = 1; $i -le $max; $i++) {
  $poll = Invoke-RestMethod `
    -Uri "http://localhost:3001/gateway/jobs/$jobId?media=image" `
    -Headers @{ Authorization = "Bearer $env:TOKEN" }
  $url = $poll.data.resultUrl ?? $poll.raw.imageInfo.result_url
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
