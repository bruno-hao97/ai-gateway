---
title: Activity hub
description: การวิเคราะห์การใช้งาน สำรวจงาน และ billing ใน developer portal
---

# Activity hub

เปิด **[Activity](/th/app/activity/)** ใน portal สำหรับการวิเคราะห์การใช้งาน (ข้อมูล `usage-history` Gommo เดียวกับตัวอย่าง Profile)

## แท็บ

| แท็บ | วัตถุประสงค์ |
|------|-------------|
| **Overview** | KPI กราฟ โมเดลยอดนิยม งานล่าสุด |
| **Trends** | กราฟเครดิต/ผลลัพธ์ + ตารางสรุปรายวัน |
| **Explore** | บันทึกงานค้นหาได้ คลิกแถวดูรายละเอียด |
| **Billing** | คำสั่งเติมเครดิตและลิงก์ด่วนไป Credits |

## พารามิเตอร์ URL

แชร์หรือ bookmark มุมมองด้วย query:

| พารามิเตอร์ | ค่า | ค่าเริ่มต้น |
|------------|-----|------------|
| `tab` | `trends`, `explore`, `billing` | Overview (ไม่ใส่ param) |
| `period` | `7d`, `30d`, `90d` | `30d` |
| `model` | Model slug | Explore เท่านั้น กรองรายการงาน |
| `job` | Job `id_base` | Explore เท่านั้น เปิด modal รายละเอียดงาน |
| `type` | `image`, `video`, `audio`, `music` | Explore เท่านั้น กรองตามประเภทงาน |
| `q` | ข้อความค้นหา | Explore เท่านั้น กรอง model/prompt (ฝั่ง client สแกนสูงสุด 30 หน้า log) |

ตัวอย่าง:

- Overview 30 วัน: `/th/app/activity/`
- Trends 90 วัน: `/th/app/activity/?tab=trends&period=90d`
- Explore โมเดลเดียว: `/th/app/activity/?tab=explore&model=imagegen_2_0&period=30d`
- Explore งานวิดีโอ: `/th/app/activity/?tab=explore&type=video&period=30d`
- ค้นหา + ประเภท: `/th/app/activity/?tab=explore&type=video&q=cat`
- เปิดรายละเอียดงาน: `/th/app/activity/?tab=explore&job=JOB_ID_BASE`

คลิก **Top models** บน Overview เพื่อไป Explore พร้อม filter โมเดล ใช้ **Copy link** ใน modal งานเพื่อแชร์ URL `?job=` **Export CSV** บน Overview ดาวน์โหลดสูงสุด 1,000 งานตาม period ที่เลือก

บน Explore filter ที่ใช้งานแสดงเป็น chip (model, type, search) การค้นหา (`q`) paginate ผ่านหน้า log ที่โหลดอัตโนมัติ (สูงสุด 30 หน้า) ก่อนแสดง “no matches”

## API

กราฟ portal เรียก wrapper gateway ตาม [ประวัติการใช้งาน](/th/reference/usage.md):

- `POST /gateway/usage/stats` — aggregate และชุดข้อมูลกราฟ
- `POST /gateway/usage/logs` — รายการงานแบบแบ่งหน้า
- `POST /gateway/usage/aggregate` — top models ฝั่งเซิร์ฟเวอร์ (`groupBy=model`)

ดูเพิ่ม [Billing & เครดิต](./billing-credits.md) และ [การยืนยันตัวตน](/th/authentication.md)

## Smoke test checklist

รันหลังแก้ UI Activity hub หรือ usage API:

```bash
npm run theme:test
npm run test:aggregate
```

ทดสอบด้วยมือ (เข้าสู่ระบบแล้ว `npm run docs:stack`):

- [ ] Overview → เปลี่ยน period → KPI/กราฟอัปเดต **Refresh** ข้าม cache top-models (`from_cache` ไม่มีใน Network → `usage/aggregate`)
- [ ] **Export CSV** พร้อม filter ประเภท → ชื่อไฟล์มีประเภทเมื่อไม่ใช่ “All”
- [ ] **Usage by type** (label `→`) → Explore พร้อม `?type=`
- [ ] Top models hint **cached** แสดง tooltip เมื่อ hover **Refresh** สแกนใหม่
- [ ] Explore **Load more** โหลดหน้าถัดไป meta แสดงจำนวนที่โหลด
- [ ] แถว Top models → Explore พร้อม `?model=`
- [ ] แท็บ Billing → ลิงก์คง `?period=` ลิงก์ Observability ทำงาน
- [ ] Explore filters → chip + `?type=` / `?q=` **Clear all filters** เมื่อไม่มีผลลัพธ์
- [ ] แถวงาน → modal **Copy link** ด้วย `?job=` ต่างกันแต่ละแถว
- [ ] `npm run theme:test` — ผ่านทั้งหมด
