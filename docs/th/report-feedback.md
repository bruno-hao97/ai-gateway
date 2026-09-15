---
title: รายงาน feedback
description: วิธีรายงาน bug และปัญหา upstream
---

# รายงาน feedback

ช่วยปรับปรุง docs และพฤติกรรม API ของ AI Gateway

## ก่อนรายงาน

1. **Health check**

   ```bash
   curl http://localhost:3001/health
   ```

2. **Reproduce แบบ minimal** — [Quickstart](./quickstart.md) หรือ [Playground](/app/playground/)

3. **จับข้อมูล** — HTTP status, response body `{ success, message, code }`, gateway version/commit

## สิ่งที่ควรใส่

| Field | ตัวอย่าง |
|-------|----------|
| **Environment** | local / Railway / Fly, Node version |
| **Mode** | B REST / C proxy / direct upstream |
| **Endpoint** | `POST https://v2.api.gommo.net/ai/jobs/image/{model_id}` (หรือ `{gateway}/gateway/jobs/image` เมื่อ dev) |
| **Request** | Redact tokens — แสดงเฉพาะรูปแบบ JSON |
| **Response** | Error envelope เต็ม |
| **Expected** | สิ่งที่คาดหวังแทน |

## หมวดหมู่

- **Gateway bug** — mapping ผิด, poll logic, auth middleware → [GitHub Issues](https://github.com/bruno-hao97/ai-gateway/issues/new)
- **Docs ผิด/ขาด** — PR หรือ issue พร้อมลิงก์หน้า (`/principles`, `/reference/…`)
- **Upstream Gommo** — upstream 4xx/5xx พร้อมข้อความ Gommo; ระบุว่า direct call เหมือนกันหรือไม่
- **PayOS / billing** — ใส่ `orderCode`, webhook logs (ไม่มี secrets)

## Security

- **ห้าม** paste `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`, PayOS keys หรือรหัสผ่านผู้ใช้
- Rotate token ที่แชร์โดยไม่ตั้งใจ

## MCP vs HTTP

ถ้าปัญหาเกี่ยวกับ tools **Cursor MCP** ระบุแยกจาก HTTP gateway — ดู [MCP & agents](./mcp/)

## ขั้นตอนถัดไป

→ [Community](./community/) · [FAQ](./faq.md) · [Quickstart](./quickstart.md)
