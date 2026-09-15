---
title: 'Recipe: งานรูปแรก'
description: Login ลิสต์โมเดล สร้างงานรูปและ poll
---

# งานรูปแรก

flow **Gommo public API** — ลิสต์โมเดล สร้างงาน poll ฝั่ง client

::: tip Gateway ทางเลือก (dev)
gateway self-host มี `wait: true` — HTTP round-trip เดียว production: poll client ตามด้านล่าง
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

## 2. ลิสต์โมเดล — เลือก slug + ratio

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
ใช้เฉพาะค่าจาก response แคตตาล็อก
:::

## 3. สร้างงาน

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

## 4. Poll จนเสร็จ

ดู [งาน async + poll](./job-poll-async.md) — interval **3.5s** สูงสุด **80** ครั้ง

## Playground

Connection → List models → **Image job** → Run

## ถัดไป

- [งาน async + poll](./job-poll-async.md)
- [อ้างอิงมีเดีย](../reference/media.md)
