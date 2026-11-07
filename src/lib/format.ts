export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatSeconds(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '—';
  if (s < 1) return `${Math.round(s * 1000)} ms`;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m < 60 ? `${m}m ${r.toString().padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(epochSeconds: number, now = Date.now() / 1000): string {
  const d = epochSeconds - now;
  const abs = Math.abs(d);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(d / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(d / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(d / 86400), 'day');
  return formatDate(epochSeconds);
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Same hue sequence as demo.track_color, so overlay colours match the rendered video. */
export function trackColor(id: number, lightness = 50): string {
  const hue = ((id * 47) % 180) * 2;
  return `hsl(${hue} 78% ${lightness}%)`;
}

export const STAGE_LABELS: Record<string, { label: string; hint: string }> = {
  extract: { label: 'Decode', hint: 'Decoding the video into frames' },
  det: { label: 'Detect', hint: 'Finding rotated text regions (YOLO11s-OBB)' },
  lsc: { label: 'Recognize', hint: 'Reading each region (ABINet LSC)' },
  fuse: { label: 'Fuse', hint: 'Confidence-aware soft score fusion' },
  track: { label: 'Track', hint: 'Linking text across frames (VPMM + LST-Matcher)' },
  vote: { label: 'Vote', hint: 'Voting one transcription per track' },
  render: { label: 'Render', hint: 'Drawing boxes, text and track IDs onto the video' },
};

export function detectorLabel(d: string | undefined): string {
  if (d === 'obb') return 'YOLO11-OBB';
  if (d === 'paddle') return 'PP-YOLOE-R';
  if (d === 'easyocr-craft') return 'EasyOCR (CRAFT + CRNN)';
  return d ?? '—';
}

export function configLabel(name: string): string {
  return name === 'pretrained' ? 'Pretrained (EasyOCR)' : name;
}

export function jobDuration(
  job: { started_at: number | null; finished_at: number | null },
  now = Date.now() / 1000,
): number | null {
  if (!job.started_at) return null;
  return (job.finished_at ?? now) - job.started_at;
}
