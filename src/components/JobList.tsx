import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Job } from '../lib/api';
import { STAGE_LABELS, formatRelative } from '../lib/format';
import { StatusBadge } from './ui';

export function jobSubtitle(job: Job): string {
  if (job.status === 'queued') return job.queue_position ? `Queued · position ${job.queue_position}` : 'Queued';
  if (job.status === 'running') return job.stage ? `${STAGE_LABELS[job.stage].label}…` : 'Starting…';
  if (job.status === 'failed') return 'Failed';
  const s = job.summary;
  return s ? `${s.tracks} tracks · ${s.frames} frames` : 'Completed';
}

/** Compact list used in side panels. */
export function JobList({ jobs }: { jobs: Job[] }) {
  return (
    <ul className="divide-y divide-zinc-100">
      {jobs.map((j) => (
        <li key={j.id}>
          <Link to={`/jobs/${j.id}`} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-zinc-900">{j.filename}</div>
              <div className="mt-0.5 truncate text-xs text-zinc-500">
                {jobSubtitle(j)} · {formatRelative(j.created_at)}
              </div>
            </div>
            <StatusBadge status={j.status} />
            <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
