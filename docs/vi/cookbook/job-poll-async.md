---
title: 'Recipe: Job async + poll'
description: Tạo job không wait, poll đến resultUrl
---

# Job async + poll loop

Dùng khi cần job id ngay và poll từ app (hoặc [Playground poll loop](/vi/app/playground/)).

Gommo poll interval: **3500ms**, tối đa **80** lần (~5 phút). Mỗi poll là một `POST` tới `/ai/jobs/{id_base}?media=…`.

::: tip Public API
Create: `POST https://v2.api.gommo.net/ai/jobs/image/{model_id}` (form body). Poll: `POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image`. Xem [Gommo public API](../reference/gommo-public-api.md).
:::

## 1. Tạo job

Giả sử `$env:TOKEN`, `$slug`, `$ratio` từ [Image job đầu tiên](./image-job-wait.md).

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN" }
$body = "domain=79ai.net&project_id=default&prompt=A cute cat&ratio=$ratio"
$created = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body

$jobId = $created.imageInfo.id_base ?? $created.data.id_base ?? $created.id_base
Write-Host "jobId=$jobId"
```

## 2. Poll một lần

```powershell
$pollBody = "domain=79ai.net&project_id=default"
$poll = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $pollBody
$poll
```

## 3. Loop đơn giản (PowerShell)

```powershell
$max = 80
$intervalSec = 3.5
for ($i = 1; $i -le $max; $i++) {
  $poll = Invoke-RestMethod -Method POST `
    -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
    -Headers $h `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $pollBody
  $url = $poll.imageInfo.result_url ?? $poll.data?.resultUrl
  if ($url) { Write-Host "Done: $url"; break }
  Write-Host "Attempt $i — waiting..."
  Start-Sleep -Seconds $intervalSec
}
```

**Poll media:** `image` | `video` | `music` — phải khớp job type.

## Playground

Media job → bỏ chọn **wait** → **Poll job** → **Auto poll (3.5s)**.

## Tiếp theo

- [Video / music job](./video-music-job.md)
- [Media reference](../reference/media.md)
