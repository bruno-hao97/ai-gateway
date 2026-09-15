---
title: Best practices
description: Pattern tích hợp — poll, auth, tham số model trên Gommo
---

# Best practices

Pattern khuyến nghị cho tích hợp **Gommo public API** ổn định.

## 1. Luôn list models trước job

Không hard-code hoặc đoán `ratio`, `mode`, `resolution`, hoặc `duration`.

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

Dùng giá trị từ mảng response của **model đó**. Giá trị sai gây upstream từ chối hoặc output kém.

→ [Models](../models/) · [Media jobs](../features/media-jobs.md)

## 2. Poll rõ ràng

| Chiến lược | Khi dùng |
|------------|----------|
| Client poll `POST …/ai/jobs/{id}?media=…` | Mọi tích hợp direct — **3500 ms** × **80** max |
| UI có progress | Cùng poll loop; hiện status từ response |
| Self-host `wait: true` | Gateway JSON tùy chọn — một HTTP round-trip |

Gommo **không webhook** khi job hoàn thành mặc định. Lên kế hoạch timeout và đường retry cho user.

## 3. Ưu tiên public API trực tiếp

Gọi **`v2.api.gommo.net`** và **`api.gommo.net`** từ backend hoặc client tin cậy. Self-host [AI Gateway](../routing/integration-modes.md) chỉ khi cần portal billing, BYOK, hoặc JSON REST wrapper.

## 4. Giữ secret trên server

| Nên | Không |
|-----|-------|
| Login từ backend hoặc token user ngắn hạn | Ship `GOMMO_ACCESS_TOKEN` ra browser |
| Merchant key chỉ trong deploy secrets | Commit `.env` |
| User Bearer cho generation | Expose admin key trên frontend |

→ [Privacy & security](../privacy/)

## 5. CORS khi browser gọi Gommo cross-origin

Browser gọi thẳng `v2.api.gommo.net` cần CORS policy Gommo. Pattern thường: **backend của bạn** proxy token user sang Gommo.

[Playground](/vi/app/playground/) same-origin dùng site proxy cho tiện dev.

## 6. Chat: luôn gửi messages

Upstream yêu cầu `messages` không rỗng cho chat:

```
POST https://api.gommo.net/api/v2/chat
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action=chat&query=Hello&messages=[…]
```

Streaming: dùng `action=stream` và consume SSE.

→ [Chat](../features/chat.md)

## 7. Upload trước job khi cần

Flow image-to-video và edit:

1. `POST https://v2.api.gommo.net/ai/upload/image` (hoặc video) → lấy URL
2. Truyền URL trong job form (tên field từ catalog model)
3. Create job và poll

## 8. Xử lý lỗi upstream

Kiểm tra `success`, `message`, và HTTP status. Không retry credential không đổi khi auth fail.

| Triệu chứng | Hành động thường |
|-------------|------------------|
| Token / domain errors | Login lại; xác minh domain đăng ký |
| Validation | Sửa form field từ catalog |
| Insufficient credits | Top up qua platform payment |
| Rate limit | Back off |

## 9. Tách billing khỏi generation

Nạp credit dùng endpoint payment **`api.gommo.net`**. Site docs có thể expose `/billing/*` khi self-host — xem [Billing & credits](../guides/billing-credits.md).

## 10. Test playground trước

[/vi/app/playground/](/vi/app/playground/) — tab **Endpoints** hiện URL public đầy đủ theo thao tác.

Sau đó tích hợp từ app với cùng token flow như [Quickstart](../quickstart.md).

## Tiếp theo

→ [Principles](../principles.md) · [Privacy](../privacy/) · [FAQ](../faq.md)
