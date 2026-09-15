import { config } from '../config.js';

export function deliveryAttemptCount(): number {
  const retries = Math.max(0, config.observability.deliveryRetryCount);
  return retries + 1;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** POST with retries on network errors and non-2xx responses. */
export async function postWithDeliveryRetries(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string; attempts: number }> {
  const maxAttempts = deliveryAttemptCount();
  const baseDelayMs = Math.max(0, config.observability.deliveryRetryDelayMs);
  let lastError = 'Unknown delivery error';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.observability.deliveryTimeoutMs);
    try {
      const res = await fetchImpl(url, { ...init, signal: controller.signal });
      if (res.ok) {
        return { ok: true, attempts: attempt };
      }
      const text = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }

    if (attempt < maxAttempts && baseDelayMs > 0) {
      await sleep(baseDelayMs * attempt);
    }
  }

  return { ok: false, error: lastError, attempts: maxAttempts };
}
