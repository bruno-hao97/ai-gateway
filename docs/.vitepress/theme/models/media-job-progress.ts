import type { PlaygroundMediaType } from './media-job';

export function mediaJobProgressLabel(
  elapsedSec: number,
  jobType: PlaygroundMediaType,
  isVi: boolean,
): string {
  const creating = elapsedSec < 8;
  if (isVi) {
    if (jobType === 'video') {
      return creating
        ? `Đang tạo job video… ${elapsedSec}s`
        : `Đang chờ render video… ${elapsedSec}s (thường 3–5 phút)`;
    }
    return creating
      ? `Đang tạo job ảnh… ${elapsedSec}s`
      : `Đang chờ render ảnh… ${elapsedSec}s`;
  }
  if (jobType === 'video') {
    return creating
      ? `Creating video job… ${elapsedSec}s`
      : `Waiting for video render… ${elapsedSec}s (often 3–5 min)`;
  }
  return creating
    ? `Creating image job… ${elapsedSec}s`
    : `Waiting for image render… ${elapsedSec}s`;
}

export function startMediaJobProgressTimer(
  onTick: (label: string) => void,
  jobType: PlaygroundMediaType,
  isVi: boolean,
): () => void {
  const started = Date.now();
  const tick = () => {
    const sec = Math.floor((Date.now() - started) / 1000);
    onTick(mediaJobProgressLabel(sec, jobType, isVi));
  };
  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}
