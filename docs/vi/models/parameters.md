---
title: Parameters
description: ratio, mode, resolution, duration — luôn lấy từ catalog models
---

# Parameters

Model Gommo trả field hợp lệ trong **response list models**. Upstream từ chối giá trị đoán.

## Response (rút gọn)

```json
{
  "success": true,
  "data": [
    {
      "model": "imagegen_2_0",
      "name": "…",
      "ratios": [{ "value": "16:9", "label": "16:9" }],
      "modes": [{ "value": "low", "label": "Low" }],
      "resolutions": [{ "value": "2k", "label": "2K" }]
    }
  ]
}
```

Tên field thay đổi theo model — **luôn** dùng mảng trong response của **model id đó**.

## Field job thường gặp

| Field | Nguồn | Ghi chú |
|-------|-------|---------|
| `ratio` | `ratios[]` trong catalog | Tỷ lệ khung hình |
| `mode` | `modes[]` | Chất lượng/tốc độ |
| `resolution` | `resolutions[]` | Kích thước output |
| `duration` | catalog (video/music) | Độ dài — không đoán |
| `prompt` | app của bạn | Prompt text |
| model id | `model`, `slug`, hoặc `id_base` | URL path khi create |

::: warning
Không copy `ratio` / `mode` / `resolution` / `duration` từ docs, model khác, hoặc ví dụ — đọc từ **models list của bạn** cho **model đó**.
:::

## Tên field slug

Upstream có thể dùng `model`, `slug`, `model_id`, hoặc `id_base`. Dùng id từ catalog trong URL create: `POST …/ai/jobs/{type}/{model_id}`.

## Tool jobs

Một số tool model dùng key khác (`url`, `image`, …). Kiểm tra `POST …/ai/models?type=…` hoặc RESPONSE trên [Playground](/vi/app/playground/).

## Tiếp theo

→ [Job types](./job-types.md) · [Media & jobs reference](../reference/media.md) · [Quickstart](../quickstart.md)
