import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Download, FileWarning } from 'lucide-react';
import type { Box, JobResult } from '../lib/api';
import { formatTimecode, trackColor } from '../lib/format';
import { LinkButton, Segmented, cx } from './ui';

export interface VideoViewerHandle {
  seekToFrame: (frame: number) => void;
}

type Mode = 'overlay' | 'rendered';

interface Props {
  sourceUrl: string;
  outputUrl: string;
  outputDownloadUrl: string;
  webVideo: boolean;
  result: JobResult;
  selectedTrack: number | null;
  hoveredTrack: number | null;
  onSelectTrack: (id: number | null) => void;
  onFrame: (frame: number) => void;
}

/** Frames are 1-based in the pipeline (logo.detector.infer_paddle.list_frames). */
function frameAt(time: number, fps: number, total: number): number {
  return Math.min(total, Math.max(1, Math.floor(time * fps + 1e-4) + 1));
}

function Overlay({
  boxes,
  texts,
  width,
  height,
  selected,
  hovered,
  showLabels,
  onSelect,
}: {
  boxes: Box[];
  texts: Record<string, string>;
  width: number;
  height: number;
  selected: number | null;
  hovered: number | null;
  showLabels: boolean;
  onSelect: (id: number | null) => void;
}) {
  const focus = hovered ?? selected;
  const stroke = Math.max(2, width / 480);
  const fontSize = Math.max(12, width / 75);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {boxes.map((b) => {
        const pts = [0, 2, 4, 6].map((i) => `${b.q[i]},${b.q[i + 1]}`).join(' ');
        const dim = focus != null && focus !== b.t;
        const active = focus === b.t;
        const color = trackColor(b.t, 55);
        const label = `#${b.t}${texts[b.t] ? ` ${texts[b.t]}` : ''}`;
        const xs = [b.q[0], b.q[2], b.q[4], b.q[6]];
        const ys = [b.q[1], b.q[3], b.q[5], b.q[7]];
        const lx = Math.max(0, Math.min(...xs));
        const ly = Math.max(fontSize + 6, Math.min(...ys) - 3);
        const lw = label.length * fontSize * 0.6 + 8;
        return (
          <g
            key={`${b.t}`}
            opacity={dim ? 0.25 : 1}
            className="pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(selected === b.t ? null : b.t);
            }}
          >
            <polygon
              points={pts}
              fill={active ? color : 'transparent'}
              fillOpacity={active ? 0.18 : 0}
              stroke={color}
              strokeWidth={active ? stroke * 1.75 : stroke}
              strokeLinejoin="round"
            />
            {showLabels && (
              <g>
                <rect x={lx} y={ly - fontSize - 4} width={lw} height={fontSize + 6} fill={color} rx={2} />
                <text
                  x={lx + 4}
                  y={ly - 3.5}
                  fontSize={fontSize}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fontWeight={600}
                  fill="#09090b"
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const VideoViewer = forwardRef<VideoViewerHandle, Props>(function VideoViewer(
  { sourceUrl, outputUrl, outputDownloadUrl, webVideo, result, selectedTrack, hoveredTrack, onSelectTrack, onFrame },
  ref,
) {
  const [mode, setMode] = useState<Mode>('overlay');
  const [showLabels, setShowLabels] = useState(true);
  const [frame, setFrame] = useState(1);
  const [failed, setFailed] = useState<Record<Mode, boolean>>({ overlay: false, rendered: false });
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const fps = result.fps || 25;

  const update = useCallback(
    (time: number) => {
      const f = frameAt(time, fps, result.num_frames);
      setFrame((prev) => (prev === f ? prev : f));
    },
    [fps, result.num_frames],
  );

  useEffect(() => onFrame(frame), [frame, onFrame]);

  // Track the displayed frame precisely where requestVideoFrameCallback exists, else per animation frame.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let handle = 0;
    let raf = 0;
    type RVFC = (cb: (now: number, meta: { mediaTime: number }) => void) => number;
    const rvfc = (v as HTMLVideoElement & { requestVideoFrameCallback?: RVFC }).requestVideoFrameCallback;
    if (rvfc) {
      const tick = (_: number, meta: { mediaTime: number }) => {
        update(meta.mediaTime);
        handle = rvfc.call(v, tick);
      };
      handle = rvfc.call(v, tick);
    } else {
      const loop = () => {
        update(v.currentTime);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    const onSeeked = () => update(v.currentTime);
    v.addEventListener('seeked', onSeeked);
    return () => {
      const cancel = (v as HTMLVideoElement & { cancelVideoFrameCallback?: (h: number) => void }).cancelVideoFrameCallback;
      if (handle && cancel) cancel.call(v, handle);
      if (raf) cancelAnimationFrame(raf);
      v.removeEventListener('seeked', onSeeked);
    };
  }, [mode, update]);

  const seek = useCallback(
    (f: number) => {
      const v = videoRef.current;
      const t = (f - 1) / fps + 0.5 / fps; // middle of the frame
      if (!v || v.readyState < 1) {
        pendingSeek.current = t;
        return;
      }
      v.pause();
      v.currentTime = t;
    },
    [fps],
  );

  useImperativeHandle(ref, () => ({ seekToFrame: seek }), [seek]);

  const switchMode = (m: Mode) => {
    const v = videoRef.current;
    if (v) pendingSeek.current = v.currentTime;
    setMode(m);
  };

  const boxes = result.frames[String(frame)] ?? [];
  const src = mode === 'overlay' ? sourceUrl : outputUrl;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2">
        <Segmented
          size="sm"
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'overlay', label: 'Interactive overlay', title: 'Source video with track boxes drawn in the browser' },
            { value: 'rendered', label: 'Rendered output', title: 'The video rendered by the pipeline' },
          ]}
        />
        <div className="flex items-center gap-4">
          {mode === 'overlay' && (
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-zinc-900"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Labels
            </label>
          )}
          <span className="num text-xs text-zinc-500">
            Frame <span className="font-medium text-zinc-800">{frame}</span> / {result.num_frames}
            <span className="mx-1.5 text-zinc-300">|</span>
            {formatTimecode((frame - 1) / fps)}
          </span>
        </div>
      </div>

      <div className="flex justify-center bg-zinc-950">
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${result.width} / ${result.height}`,
          maxWidth: `calc(70vh * ${result.width / Math.max(1, result.height)})`,
        }}
      >
        {failed[mode] ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <FileWarning className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
            <div className="max-w-md text-sm text-zinc-300">
              {mode === 'rendered' && !webVideo
                ? 'The rendered video uses the mp4v codec, which browsers cannot play. Install ffmpeg on the API host to get a browser-playable copy, or download the file.'
                : 'Your browser cannot play this video format.'}
            </div>
            <LinkButton
              href={mode === 'rendered' ? outputDownloadUrl : sourceUrl}
              download
              size="sm"
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Download
            </LinkButton>
          </div>
        ) : (
          <>
            <video
              key={src}
              ref={videoRef}
              src={src}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-contain"
              onLoadedMetadata={(e) => {
                if (pendingSeek.current != null) {
                  e.currentTarget.currentTime = pendingSeek.current;
                  pendingSeek.current = null;
                }
              }}
              onError={() => setFailed((f) => ({ ...f, [mode]: true }))}
            />
            {mode === 'overlay' && (
              <Overlay
                boxes={boxes}
                texts={result.texts}
                width={result.width}
                height={result.height}
                selected={selectedTrack}
                hovered={hoveredTrack}
                showLabels={showLabels}
                onSelect={onSelectTrack}
              />
            )}
          </>
        )}
      </div>
      </div>
      <div className={cx('flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500')}>
        <span>
          {boxes.length} {boxes.length === 1 ? 'box' : 'boxes'} in this frame
        </span>
        <span className="num">
          {result.width}×{result.height} · {fps.toFixed(2)} fps
        </span>
      </div>
    </div>
  );
});
