import { Check, Loader2, X } from 'lucide-react';
import { STAGES, type Job, type Stage } from '../lib/api';
import { STAGE_LABELS, formatSeconds } from '../lib/format';
import { cx } from './ui';

type State = 'done' | 'active' | 'failed' | 'pending';

function stageDurations(job: Job, now: number): Partial<Record<Stage, number>> {
  if (job.status === 'succeeded' && job.summary) return job.summary.seconds;
  const out: Partial<Record<Stage, number>> = {};
  const marks = STAGES.filter((s) => job.timeline[s] != null);
  marks.forEach((s, i) => {
    const start = job.timeline[s]!;
    const next = marks[i + 1];
    const end = next ? job.timeline[next]! : job.status === 'running' ? now : (job.finished_at ?? now);
    out[s] = Math.max(0, end - start);
  });
  return out;
}

export function StageProgress({ job, now }: { job: Job; now: number }) {
  const durations = stageDurations(job, now);
  const reached = STAGES.filter((s) => job.timeline[s] != null);
  const last = reached[reached.length - 1];

  const stateOf = (s: Stage): State => {
    if (job.status === 'succeeded') return 'done';
    if (job.timeline[s] == null) return 'pending';
    if (s !== last) return 'done';
    return job.status === 'failed' ? 'failed' : 'active';
  };

  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-4 lg:grid-cols-7">
      {STAGES.map((s, i) => {
        const st = stateOf(s);
        return (
          <li key={s} className={cx('bg-white px-3 py-2.5', st === 'active' && 'bg-accent-50/40')}>
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold',
                  st === 'done' && 'bg-zinc-900 text-white',
                  st === 'active' && 'text-accent-600',
                  st === 'failed' && 'bg-red-600 text-white',
                  st === 'pending' && 'border border-zinc-300 text-zinc-400',
                )}
              >
                {st === 'done' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                {st === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
                {st === 'failed' && <X className="h-2.5 w-2.5" strokeWidth={3} />}
                {st === 'pending' && i + 1}
              </span>
              <span className={cx('text-xs font-medium', st === 'pending' ? 'text-zinc-400' : 'text-zinc-800')}>
                {STAGE_LABELS[s].label}
              </span>
            </div>
            <div className="num mt-1 pl-6 text-2xs text-zinc-500">
              {durations[s] != null ? formatSeconds(durations[s]) : st === 'pending' ? '—' : ''}
            </div>
            {st === 'active' && job.progress?.stage === s && job.progress.total > 0 && (
              <div className="mt-1.5 pl-6">
                <div className="h-1 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-accent-600 transition-[width] duration-500"
                    style={{ width: `${(100 * job.progress.done) / job.progress.total}%` }}
                  />
                </div>
                <div className="num mt-1 text-2xs text-zinc-500">
                  {job.progress.done}/{job.progress.total} frames
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
