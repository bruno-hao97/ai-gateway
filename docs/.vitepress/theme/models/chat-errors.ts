import { pickMsg, type PortalLocale } from './portal-locale';

export interface FormattedChatError {
  message: string;
  suggestModel: boolean;
  suggestRetry: boolean;
}

function resolveLocale(locale: PortalLocale | boolean): PortalLocale {
  if (typeof locale === 'boolean') return locale ? 'vi' : 'en';
  return locale;
}

function msg(locale: PortalLocale, en: string, vi: string, th?: string): string {
  return pickMsg(locale, en, vi, th);
}

export function formatChatError(err: unknown, locale: PortalLocale | boolean): FormattedChatError {
  const loc = resolveLocale(locale);
  const raw = err instanceof Error ? err.message : String(err || 'Chat failed');
  const lower = raw.toLowerCase();

  if (lower.includes('abort') || lower.includes('stopped')) {
    return {
      message: msg(loc, 'Stopped.', 'Đã dừng.', 'หยุดแล้ว'),
      suggestModel: false,
      suggestRetry: false,
    };
  }

  if (lower.includes('credit') || lower.includes('balance') || lower.includes('số dư')) {
    return {
      message: msg(
        loc,
        'Insufficient credits. Top up or pick a cheaper model.',
        'Không đủ credit. Nạp thêm hoặc chọn model rẻ hơn.',
        'เครดิตไม่เพียงพอ — เติมเครดิตหรือเลือกโมเดลที่ถูกกว่า',
      ),
      suggestModel: true,
      suggestRetry: false,
    };
  }

  if (
    lower.includes('not_available') ||
    lower.includes('not available') ||
    lower.includes('không khả dụng') ||
    lower.includes('dịch vụ hiện không')
  ) {
    return {
      message: msg(
        loc,
        'Model temporarily unavailable upstream. Try another model or retry later.',
        'Model tạm ngưng trên upstream. Thử model khác hoặc quay lại sau.',
        'โมเดลไม่พร้อมใช้งานชั่วคราว — ลองโมเดลอื่นหรือลองใหม่ภายหลัง',
      ),
      suggestModel: true,
      suggestRetry: true,
    };
  }

  if (lower.includes('không hợp lệ') || lower.includes('invalid model')) {
    return {
      message: msg(
        loc,
        'Invalid model for this job type. Check image/video tab or pick another model.',
        'Model không hợp lệ cho loại job này. Kiểm tra tab ảnh/video hoặc đổi model.',
        'โมเดลไม่ถูกต้องสำหรับงานนี้ — ตรวจแท็บภาพ/วิดีโอหรือเลือกโมเดลอื่น',
      ),
      suggestModel: true,
      suggestRetry: false,
    };
  }

  if (lower.includes('model') && (lower.includes('invalid') || lower.includes('not found') || lower.includes('unsupported'))) {
    return {
      message: msg(
        loc,
        'Model unavailable. Try another model.',
        'Model không khả dụng. Thử đổi model khác.',
        'โมเดลไม่พร้อมใช้งาน — ลองโมเดลอื่น',
      ),
      suggestModel: true,
      suggestRetry: true,
    };
  }

  if (lower.includes('empty chat')) {
    return {
      message: msg(loc, 'Empty response from upstream.', 'Phản hồi trống từ upstream.', 'ไม่มีการตอบกลับจาก upstream'),
      suggestModel: true,
      suggestRetry: true,
    };
  }

  if (lower.includes('http 429') || lower.includes('rate limit')) {
    return {
      message: msg(
        loc,
        'Too many requests — try again shortly.',
        'Quá nhiều request — thử lại sau.',
        'คำขอมากเกินไป — ลองใหม่ในอีกสักครู่',
      ),
      suggestModel: false,
      suggestRetry: true,
    };
  }

  if (loc === 'th' && /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(raw)) {
    return {
      message: msg(
        loc,
        raw,
        raw,
        'เกิดข้อผิดพลาดจากบริการ — ลองอีกครั้งหรือเลือกโมเดลอื่น',
      ),
      suggestModel: true,
      suggestRetry: true,
    };
  }

  return {
    message: raw,
    suggestModel:
      lower.includes('upstream') ||
      lower.includes('http 5') ||
      lower.includes('job failed') ||
      lower.includes('model'),
    suggestRetry: true,
  };
}

/** Shared formatter for chat + playground media jobs. */
export const formatMediaJobError = formatChatError;
