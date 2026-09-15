---
title: Changelog
description: อัปเดต docs และแพลตฟอร์ม AI Gateway
---

# Changelog

การเปลี่ยนแปลงสำคัญของ docs site, portal และ gateway REST surface

## 2026-03-11

### Docs

- Local search, **Edit on GitHub** และลิงก์ GitHub ใน nav bar
- แผนภาพ routing แบบ ASCII บน [Principles](./principles.md) และ [Routing](./routing/) (ลบ Mermaid — conflict ESM `fastdom` ใน dev)
- ส่วน **Choose your path** บน [Quickstart](./quickstart.md)
- Prose styling สำหรับตาราง, callouts และ code blocks

### Playground (portal)

- Request tab: public URL เต็ม, JSON body preview, ตัวอย่างโครงสร้าง response
- Tab pinning ระหว่าง job poll (อยู่ที่ Request / Endpoints ขณะ polling)

---

::: info Upstream dependency
Media jobs, catalog และ login ต้องการ **Gommo public API** (`v2.api.gommo.net`, `api.gommo.net`) เมื่อ upstream ล่ม docs และ UI ยังใช้ได้; API call สดจะล้มเหลวจนกว่าบริการกลับมา
:::
