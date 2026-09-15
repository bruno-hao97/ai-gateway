---
title: ?????
description: GitHub, issues, contributions และช่องทาง support
---

# Community

AI Gateway เป็นโปรเจกต์ docs + API platform แบบเปิด ช่องทาง community หลักวันนี้คือ **GitHub**

## Repository

**[github.com/bruno-hao97/ai-gateway](https://github.com/bruno-hao97/ai-gateway)**

Clone และรันในเครื่อง:

```bash
git clone https://github.com/bruno-hao97/ai-gateway.git
cd ai-gateway
cp .env.example .env
npm install
npm run dev
```

## GitHub Issues

ใช้ Issues สำหรับ:

| ประเภท | Label / คำใบ้ title |
|--------|---------------------|
| Bug ใน gateway API | `bug` — ใส่ขั้นตอน repro |
| Docs ผิดหรือขาด | `documentation` — ลิงก์หน้า doc |
| Feature request | `enhancement` — อธิบาย use case |
| พฤติกรรม upstream Gommo | ระบุการเปรียบเทียบ **direct vs gateway** |
| ความกังวลด้าน security | **ห้าม** paste secrets — ดูด้านล่าง |

**เปิด issue:** [github.com/bruno-hao97/ai-gateway/issues/new](https://github.com/bruno-hao97/ai-gateway/issues/new)

ก่อนเปิด ดู [Report feedback](./../report-feedback.md) สำหรับข้อมูลที่ต้องการ

## Pull requests

ยินดีรับการปรับปรุง docs โดยเฉพาะ:

- หน้า VitePress ใต้ `docs/` และ `docs/vi/`
- ความถูกต้อง API reference กับ `src/routes/`
- ตัวอย่าง (curl, PowerShell) ที่ตรง [Quickstart](./../quickstart.md)

1. Fork → branch → แก้ markdown
2. `npm run docs:build` ต้องผ่าน
3. เปิด PR ระบุ **หน้าไหน** และ **ทำไม**

การแก้ `src/` ควรมี test plan สั้น (curl หรือ script path)

## Discussions

ยังไม่มี Discord หรือ forum อย่างเป็นทางการ ตอนนี้:

- **คำถาม** → GitHub Issue พร้อม `question` (หรือ Discussions ถ้าเปิดบน repo)
- **แชท integrator** → ช่องทางทีมของคุณเอง

ถ้า repo เปิด [GitHub Discussions](https://docs.github.com/en/discussions) ใช้สำหรับ Q&A เปิดกว้าง; เก็บ Issues สำหรับ bug ที่แก้ได้

## สิ่งที่เราไม่ support ที่นี่

| หัวข้อ | ที่ไป |
|--------|-------|
| End-user studio / site-ai UI | Out of scope — API platform เท่านั้น |
| Cursor MCP `gommo_*` runtime | IDE tooling — ดู [MCP & agents](../mcp/) |
| ข้อพิพาท billing บัญชี Gommo | Gommo support / merchant admin ของคุณ |

## รายงาน security

**ห้าม** เปิด public issue พร้อม live tokens อีเมลหรือ private security advisory (ถ้ามีบน GitHub) พร้อม:

- ขั้นตอน reproduce
- ประเมินผลกระทบ
- Log ที่ redact แล้วเท่านั้น

แนวทางทั่วไป → [Privacy & security](./../privacy/)

## ติดตามอัปเดต

- Watch repo บน GitHub สำหรับ releases และอัปเดต docs
- Docs site: build จาก `docs/` ผ่าน `npm run docs:dev` หรือ static host ที่ deploy

## ที่เกี่ยวข้อง

→ [Report feedback](./../report-feedback.md) · [FAQ](./../faq.md) · [Deploy & ops](./../deploy/)
