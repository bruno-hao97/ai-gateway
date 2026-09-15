import type { ChatAttachment } from './chat-storage';
import { pickMsg, resolveLabelLocale, type PortalLocale } from './portal-locale';

export function attachmentBadgeLabel(
  att: ChatAttachment,
  localeOrVi: PortalLocale | boolean,
): string {
  const locale = resolveLabelLocale(localeOrVi);
  if (att.purpose === 'job') {
    const kind =
      att.jobTarget === 'video'
        ? pickMsg(locale, 'Video', 'Video', 'วิดีโอ')
        : pickMsg(locale, 'Image', 'Ảnh', 'ภาพ');
    const job = pickMsg(locale, 'Job', 'Job', 'งาน');
    return `${job} · ${kind}`;
  }
  return pickMsg(locale, 'Chat', 'Chat', 'แชท');
}
