import { memo, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import type { Track } from '../lib/api';
import { formatNumber, trackColor } from '../lib/format';
import { cx } from './ui';

type SortKey = 'id' | 'text' | 'first_frame' | 'duration' | 'boxes' | 'mean_score';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'id', label: 'Track' },
  { key: 'text', label: 'Text' },
  { key: 'first_frame', label: 'Frames', align: 'right' },
  { key: 'duration', label: 'Duration', align: 'right' },
  { key: 'boxes', label: 'Boxes', align: 'right' },
  { key: 'mean_score', label: 'Score', align: 'right' },
];

export const TracksTable = memo(function TracksTable({
  tracks,
  fps,
  visible,
  selected,
  onSelect,
  onHover,
}: {
  tracks: Track[];
  fps: number;
  /** Track ids present in the current frame. */
  visible: Set<number>;
  selected: number | null;
  onSelect: (t: Track) => void;
  onHover: (id: number | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'first_frame', dir: 1 });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? tracks.filter((t) => t.text.toLowerCase().includes(q) || `#${t.id}`.includes(q) || String(t.id) === q)
      : tracks;
    const val = (t: Track): number | string =>
      sort.key === 'duration' ? t.last_frame - t.first_frame : sort.key === 'text' ? t.text.toLowerCase() : t[sort.key];
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : a.id - b.id) * sort.dir;
    });
  }, [tracks, query, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'text' || key === 'id' || key === 'first_frame' ? 1 : -1 }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by text or track ID"
            className="focus-ring h-8 w-full rounded-md border border-zinc-300 bg-white pl-8 pr-2 text-xs placeholder:text-zinc-400 focus-visible:border-accent-500"
          />
        </div>
        <span className="num shrink-0 text-xs text-zinc-500">
          {rows.length === tracks.length ? `${tracks.length} tracks` : `${rows.length} of ${tracks.length}`}
        </span>
      </div>
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500">
            <tr className="border-b border-zinc-200">
              {COLUMNS.map((c) => (
                <th key={c.key} className={cx('px-4 py-2 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}>
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    className={cx(
                      'inline-flex items-center gap-1 hover:text-zinc-900',
                      sort.key === c.key && 'text-zinc-900',
                    )}
                  >
                    {c.label}
                    {sort.key === c.key &&
                      (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((t) => (
              <tr
                key={t.id}
                onClick={() => onSelect(t)}
                onMouseEnter={() => onHover(t.id)}
                onMouseLeave={() => onHover(null)}
                className={cx(
                  'cursor-pointer transition-colors',
                  selected === t.id ? 'bg-accent-50/70' : 'hover:bg-zinc-50',
                )}
              >
                <td className="whitespace-nowrap px-4 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: trackColor(t.id, 55) }} />
                    <span className="num font-mono font-medium text-zinc-800">#{t.id}</span>
                    {visible.has(t.id) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Visible in current frame" />
                    )}
                  </span>
                </td>
                <td className="max-w-[16rem] truncate px-4 py-2 font-mono text-zinc-900">
                  {t.text || <span className="font-sans italic text-zinc-400">no text</span>}
                </td>
                <td className="num whitespace-nowrap px-4 py-2 text-right text-zinc-600">
                  {t.first_frame}–{t.last_frame}
                </td>
                <td className="num whitespace-nowrap px-4 py-2 text-right text-zinc-600">
                  {((t.last_frame - t.first_frame + 1) / fps).toFixed(2)} s
                </td>
                <td className="num px-4 py-2 text-right text-zinc-600">{t.boxes}</td>
                <td className="num px-4 py-2 text-right text-zinc-600">{formatNumber(t.mean_score, 2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-zinc-500">
                  {tracks.length === 0 ? 'No text was tracked in this video.' : 'No tracks match the filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
