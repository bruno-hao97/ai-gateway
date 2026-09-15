---
title: คู่มือปฏิบัติ
description: สูตรตามงาน — คัดลอก รัน ใช้งานจริง
---

# คู่มือปฏิบัติ

สูตรทีละขั้นสำหรับ **[Gommo public API](../reference/gommo-public-api.md)** (`v2.api.gommo.net` + `api.gommo.net`) แต่ละหน้าคืองานเดียวครบ พร้อม curl + PowerShell

::: tip Gateway ทางเลือก (dev)
สูตรอาจแสดง **AI Gateway** (`/gateway/*` body JSON) เป็นทางลัด local การเชื่อมต่อ production ควรเรียกโฮสต์ Gommo โดยตรง — ดู [Gommo public API](../reference/gommo-public-api.md)
:::

::: tip ลองในเบราว์เซอร์ก่อน
[Playground](/th/app/playground/) — ฝังใน docs เข้าสู่ระบบเพื่อรันงาน แท็บ **Request** แสดง URL สาธารณะ **Try/Send** อาจ proxy ผ่าน gateway local
:::

## สิ่งที่ต้องมี (ทุกสูตร)

| รายการ | ค่า |
|--------|-----|
| Public API | `https://v2.api.gommo.net` (งาน) · `https://api.gommo.net` (auth/chat) |
| Token | Gommo user `access_token` — [การยืนยันตัวตน](../authentication.md) |
| Catalog | ห้ามเดา `ratio` / `mode` / `resolution` / `duration` — [โมเดล](../models/) |

```powershell
$env:TOKEN = "<access_token>"
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/x-www-form-urlencoded' }
```

## สูตร

### เริ่มต้น

| สูตร | สิ่งที่สร้าง |
|------|-------------|
| [งานรูปแรก](./image-job-wait.md) | Login → models → รูป + client poll |
| [งาน async + poll loop](./job-poll-async.md) | `wait: false` → poll เอง / loop |

### มีเดีย

| สูตร | สิ่งที่สร้าง |
|------|-------------|
| [งานวิดีโอหรือเพลง](./video-music-job.md) | pattern เดียว ต่าง `type` |
| [งาน tool (upscale, remove-bg)](./tool-jobs.md) | อัปโหลด → upscale / ลบพื้นหลัง |
| [อัปโหลดรูป](./upload-image.md) | Multipart upload → URL สาธารณะ |

### แพลตฟอร์ม

| สูตร | สิ่งที่สร้าง |
|------|-------------|
| [แชท + stream](./chat-stream.md) | Agent chat และ SSE |
| [Audio TTS](./audio-tts.md) | ค้นหาเสียง → สังเคราะห์ |
| [Gommo VietQR เติมเครดิต](./gommo-topup.md) | แพ็กเครดิต → VietQR → poll sync |
| [PayOS เติมเครดิต (legacy)](./payos-topup.md) | Merchant PayOS + sendBalances |
| [Flow HTTP เอเจนต์](./agent-http-flow.md) | Loop ขั้นต่ำสำหรับ LLM agent / script |

## ถัดไป

- [เริ่มต้นใช้งาน](../quickstart.md) — เส้นทางเดียวต่อเนื่อง
- [อ้างอิง API](../reference/media.md) — spec endpoint ฉบับเต็ม
- [OpenAPI](../reference/openapi.md)
