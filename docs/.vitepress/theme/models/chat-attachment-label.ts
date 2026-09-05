import type { ChatAttachment } from './chat-storage';

export function attachmentBadgeLabel(att: ChatAttachment, isVi: boolean): string {
  if (att.purpose === 'job') {
    const kind =
      att.jobTarget === 'video'
        ? isVi
          ? 'Video'
          : 'Video'
        : isVi
          ? 'Ảnh'
          : 'Image';
    return isVi ? `Job · ${kind}` : `Job · ${kind}`;
  }
  return isVi ? 'Chat' : 'Chat';
}
