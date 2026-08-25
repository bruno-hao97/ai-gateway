---
title: 'Recipe: Job async + poll'
description: Tạo job không wait, rồi poll đến resultUrl
---

# Job async + poll loop

Dùng khi bạn cần job id ngay và poll từ app (hoặc [Playground poll loop](http://localhost:3001/portal/playground.html)).

Gateway poll upstream: **3500ms**, tối đa **80** lần khi `wait: true` lúc create. Poll thủ công = một lần check status mỗi `GET`.

## 1. Tạo job (`wait: false`)

Giả sử đã có `$env:TOKEN`, `$slug`, `$ratio` từ [Image job đầu tiên](./image-job-wait.md).

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

## 2. Poll một lần

```powershell
$poll = Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/jobs/$jobId?media=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$poll
```

## 3. Loop đơn giản (PowerShell)

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

**Poll media:** `image` | `video` | `music` — phải khớp loại job.

## Playground

Media job → tắt **wait** → **Poll job** → **Auto poll (3.5s)**.

## Tiếp theo

- [Video / music job](./video-music-job.md)
- [Media reference](../reference/media.md)
