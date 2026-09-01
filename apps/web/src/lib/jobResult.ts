export function pickJobResultUrl(data: unknown, media: 'image' | 'video' = 'image'): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const nested = d.data as Record<string, unknown> | undefined;
  const poll = nested?.pollResult as Record<string, unknown> | undefined;
  const raw = d.raw as Record<string, unknown> | undefined;
  const imageInfo = raw?.imageInfo as { result_url?: string } | undefined;
  const videoInfo = raw?.videoInfo as { result_url?: string } | undefined;
  const url =
    nested?.resultUrl ||
    poll?.resultUrl ||
    (media === 'video' ? videoInfo?.result_url : imageInfo?.result_url) ||
    imageInfo?.result_url ||
    videoInfo?.result_url;
  return typeof url === 'string' && url.startsWith('http') ? url : null;
}
