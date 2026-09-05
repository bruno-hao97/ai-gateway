export interface FormattedChatError {
  message: string;
  suggestModel: boolean;
  suggestRetry: boolean;
}

export function formatChatError(err: unknown, isVi: boolean): FormattedChatError {
  const raw = err instanceof Error ? err.message : String(err || 'Chat failed');
  const lower = raw.toLowerCase();

  if (lower.includes('abort') || lower.includes('stopped')) {
    return { message: isVi ? 'Đã dừng.' : 'Stopped.', suggestModel: false, suggestRetry: false };
  }

  if (lower.includes('credit') || lower.includes('balance') || lower.includes('số dư')) {
    return {
      message: isVi
        ? 'Không đủ credit. Nạp thêm hoặc chọn model rẻ hơn.'
        : 'Insufficient credits. Top up or pick a cheaper model.',
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
      message: isVi
        ? 'Model tạm ngưng trên upstream. Thử model khác hoặc quay lại sau.'
        : 'Model temporarily unavailable upstream. Try another model or retry later.',
      suggestModel: true,
      suggestRetry: true,
    };
  }

  if (lower.includes('không hợp lệ') || lower.includes('invalid model')) {
    return {
      message: isVi
        ? 'Model không hợp lệ cho loại job này. Kiểm tra tab ảnh/video hoặc đổi model.'
        : 'Invalid model for this job type. Check image/video tab or pick another model.',
      suggestModel: true,
      suggestRetry: false,
    };
  }

  if (lower.includes('model') && (lower.includes('invalid') || lower.includes('not found') || lower.includes('unsupported'))) {
    return {
      message: isVi
        ? 'Model không khả dụng. Thử đổi model khác.'
        : 'Model unavailable. Try another model.',
      suggestModel: true,
      suggestRetry: true,
    };
  }

  if (lower.includes('empty chat')) {
    return {
      message: isVi ? 'Phản hồi trống từ upstream.' : 'Empty response from upstream.',
      suggestModel: true,
      suggestRetry: true,
    };
  }

  if (lower.includes('http 429') || lower.includes('rate limit')) {
    return {
      message: isVi ? 'Quá nhiều request — thử lại sau.' : 'Too many requests — try again shortly.',
      suggestModel: false,
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
