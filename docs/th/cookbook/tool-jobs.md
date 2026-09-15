---
title: 'สูตร: งาน tool (upscale, remove-bg)'
description: อัปโหลด asset ต้นทาง ลิสต์โมเดล tool รันเครื่องมือรูปหรือวิดีโอ
---

# งาน tool (upscale, remove-bg)

งาน tool ใช้รูปแบบ REST เหมือนงานมีเดีย — ต่างแค่ **`type` งาน** และ **poll `media`**

| ประเภท tool | Endpoint | Poll `?media=` |
|-------------|----------|----------------|
| `image-upscale` | `POST /gateway/jobs/image-upscale` | `image` |
| `remove-bg` | `POST /gateway/jobs/remove-bg` | `image` |
| `video-upscale` | `POST /gateway/jobs/video-upscale` | `video` |
| `video-vfx`, `video-subtitle`, `video-cut` | `POST /gateway/jobs/{type}` | `video` |

## 1. อัปโหลดต้นทาง (ถ้าต้องการ)

หลาย tool ต้องมี URL อินพุตก่อน — ดู [อัปโหลดรูป](./upload-image.md)

```powershell
$upload = curl.exe -s -X POST "http://localhost:3001/gateway/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "file=@C:\path\to\product.png" | ConvertFrom-Json
$imageUrl = $upload.data.url
```

## 2. ลิสต์โมเดล tool

```powershell
$type = 'remove-bg'   # หรือ image-upscale, video-upscale, …
$models = Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=$type" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$m = $models.data[0]
$slug = $m.model ?? $m.slug
```

เพิ่มฟิลด์แคตตาล็อก (`ratio`, `mode`, `resolution`, …) จากรายการโมเดล — **ห้ามเดา**

## 3. สร้างงาน tool

ส่งชื่อฟิลด์เพิ่มจากแคตตาล็อกโมเดล (เช่น URL รูป) pattern ทั่วไปหลังอัปโหลด:

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$fields = @{
  prompt = 'Product on white background'
  image_url = $imageUrl   # ชื่อฟิลด์จากแคตตาล็อกถ้าจำเป็น
}
# เพิ่ม ratio/mode/resolution จากแคตตาล็อกเมื่อมี:
# $fields.ratio = $ratio

$jobBody = @{
  modelSlug = $slug
  wait = $true
  fields = $fields
} | ConvertTo-Json -Depth 5

$job = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/$type" `
  -Headers $h -Body $jobBody
$job.data.resultUrl
```

::: tip ชื่อฟิลด์
ถ้าแคตตาล็อกต้องการคีย์อื่น (`url`, `image`, …) ใช้คีย์นั้นจาก upstream — ตรวจ `GET /gateway/models?type=…` หรือ RESPONSE ใน [Playground](/th/app/playground/)
:::

## 4. Async + poll

เหมือน [งาน async + poll](./job-poll-async.md) — ใช้ poll media `image` สำหรับ tool รูป `video` สำหรับ tool วิดีโอ

## Playground

Sidebar **Tool jobs** → **Remove bg** หรือ **Upscale image** → List models สำหรับประเภทนั้น → Run

## ถัดไป

- [อัปโหลดรูป](./upload-image.md)
- [อ้างอิงมีเดีย](../reference/media.md)
