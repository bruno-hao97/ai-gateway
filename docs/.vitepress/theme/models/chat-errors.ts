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
    suggestModel: lower.includes('upstream') || lower.includes('http 5'),
    suggestRetry: true,
  };
}
