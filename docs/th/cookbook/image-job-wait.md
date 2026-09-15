---
title: 'สูตร: งานรูปแรก (wait)'
description: Login ลิสต์โมเดล สร้างงานรูปด้วย wait true
---

# งานรูปแรก (`wait: true`)

เซิร์ฟเวอร์ poll upstream ทุก **3.5s** สูงสุด **80** ครั้ง — ได้ `resultUrl` ใน response เดียว

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

## 2. ลิสต์โมเดล — เลือก slug + ratio

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
ใช้**เฉพาะ**ค่าจาก response แคตตาล็อก
:::

## 3. สร้างงาน

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

Connection → List models → **Image job** → Run พร้อมเลือก **wait**

## ถัดไป

- [งาน async + poll](./job-poll-async.md)
- [อ้างอิงมีเดีย](../reference/media.md)
