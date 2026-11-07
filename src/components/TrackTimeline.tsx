import { memo, useRef, type MouseEvent } from 'react';
import type { Track } from '../lib/api';
import { trackColor } from '../lib/format';

const ROW = 10;
const GAP = 3;

/** One bar per track across the frame range; click to seek. Playhead drawn as a separate layer. */
export const TrackTimeline = memo(function TrackTimeline({
  tracks,
  numFrames,
  frame,
  selected,
  onSeek,
  onSelect,
  onHover,
}: {
  tracks: Track[];
  numFrames: number;
  frame: number;
  selected: number | null;
  onSeek: (frame: number) => void;
  onSelect: (id: number | null) => void;
  onHover: (id: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const height = Math.max(ROW, tracks.length * (ROW + GAP) - GAP);
  const pct = (f: number) => ((f - 1) / Math.max(1, numFrames - 1)) * 100;

  const onBackgroundClick = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const f = Math.round(((e.clientX - r.left) / r.width) * (numFrames - 1)) + 1;
    onSeek(Math.min(numFrames, Math.max(1, f)));
  };

  return (
    <div>
      <div className="max-h-48 overflow-y-auto pr-1">
        <div ref={ref} className="relative cursor-crosshair" style={{ height }} onClick={onBackgroundClick}>
          {tracks.map((t, i) => {
            const left = pct(t.first_frame);
            const width = Math.max(0.4, pct(t.last_frame) - left);
            const dim = selected != null && selected !== t.id;
            return (
              <button
                key={t.id}
                type="button"
                title={`#${t.id} ${t.text || '(no text)'} · frames ${t.first_frame}–${t.last_frame}`}
                className="absolute rounded-sm transition-opacity hover:opacity-100 focus:outline-none"
                style={{
                  top: i * (ROW + GAP),
                  height: ROW,
                  left: `${left}%`,
                  width: `${width}%`,
                  background: trackColor(t.id, 55),
                  opacity: dim ? 0.25 : 0.9,
                  outline: selected === t.id ? '1.5px solid #18181b' : undefined,
                  outlineOffset: 1,
                }}
                onMouseEnter={() => onHover(t.id)}
                onMouseLeave={() => onHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(t.id);
                  onSeek(t.first_frame);
                }}
              />
            );
          })}
          <div
            className="pointer-events-none absolute -bottom-1 -top-1 w-px bg-zinc-900"
            style={{ left: `${pct(frame)}%` }}
          />
        </div>
      </div>
      <div className="num mt-2 flex justify-between text-2xs text-zinc-400">
        <span>1</span>
        <span>{Math.round(numFrames / 2)}</span>
        <span>{numFrames}</span>
      </div>
    </div>
  );
});
