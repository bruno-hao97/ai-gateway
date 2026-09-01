---
title: Community
description: GitHub, issues, đóng góp và kênh hỗ trợ
---

# Community

AI Gateway là dự án nền tảng API + docs mở. Kênh community chính hiện tại là **GitHub**.

## Repository

**[github.com/bruno-hao97/ai-gateway](https://github.com/bruno-hao97/ai-gateway)**

```bash
git clone https://github.com/bruno-hao97/ai-gateway.git
cd ai-gateway
cp .env.example .env
npm install
npm run dev
```

## GitHub Issues

Dùng Issues cho:

| Loại | Gợi ý |
|------|--------|
| Lỗi API gateway | `bug` — bước tái hiện |
| Docs sai/thiếu | `documentation` — link trang |
| Feature request | `enhancement` — use case |
| Hành vi upstream Gommo | So sánh direct vs gateway |
| Bảo mật | **Không** dán secret |

**Tạo issue:** [github.com/bruno-hao97/ai-gateway/issues/new](https://github.com/bruno-hao97/ai-gateway/issues/new)

Trước khi mở, xem [Góp ý](../report-feedback.md).

## Pull requests

Hoan nghênh cải thiện docs:

- Trang VitePress `docs/` và `docs/vi/`
- Reference API khớp `src/routes/`
- Ví dụ curl/PowerShell

1. Fork → branch → sửa markdown
2. `npm run docs:build` pass
3. PR mô tả trang + lý do

Sửa `src/` nên kèm test plan ngắn.

## Discussions

Chưa có Discord/forum chính thức:

- **Câu hỏi** → GitHub Issue `question` (hoặc Discussions nếu repo bật)
- **Chat nội bộ team** → kênh riêng của bạn

## Ngoài phạm vi

| Chủ đề | Ghi chú |
|--------|---------|
| Studio / site-ai UI | Out of scope — chỉ API platform |
| Cursor MCP `gommo_*` | IDE — xem [MCP](../mcp/) |
| Tranh chấp billing Gommo | Gommo / merchant admin |

## Bảo mật

Không mở issue public với token thật. Báo private nếu có advisory trên GitHub.

→ [Privacy](../privacy/)

## Liên quan

→ [Góp ý](../report-feedback.md) · [FAQ](../faq.md) · [Deploy](../deploy/)
