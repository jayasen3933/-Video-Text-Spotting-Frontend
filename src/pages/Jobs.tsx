import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Inbox, Plus } from 'lucide-react';
import { api, type JobStatus } from '../lib/api';
import { configLabel, formatBytes, formatDate, formatRelative, formatSeconds, jobDuration } from '../lib/format';
import { useAsync, useNow } from '../lib/hooks';
import { jobSubtitle } from '../components/JobList';
import { Alert, Button, Card, EmptyState, LoadingBlock, PageHeader, Segmented, StatusBadge } from '../components/ui';

type Filter = 'all' | 'active' | JobStatus;

export default function Jobs() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const jobs = useAsync(api.jobs, [], { intervalMs: 3000 });
  const anyActive = jobs.data?.some((j) => j.status === 'queued' || j.status === 'running') ?? false;
  const now = useNow(1000, anyActive);

  const rows = useMemo(() => {
    const all = jobs.data ?? [];
    if (filter === 'all') return all;
    if (filter === 'active') return all.filter((j) => j.status === 'queued' || j.status === 'running');
    return all.filter((j) => j.status === filter);
  }, [jobs.data, filter]);

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, succeeded: 0, failed: 0 };
    for (const j of jobs.data ?? []) {
      c.all++;
      if (j.status === 'queued' || j.status === 'running') c.active++;
      if (j.status === 'succeeded') c.succeeded++;
      if (j.status === 'failed') c.failed++;
    }
    return c;
  }, [jobs.data]);

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every video submitted to this API server. Jobs run one at a time on the server's device."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/')}>
            New analysis
          </Button>
        }
      />

      {jobs.error && !jobs.data && (
        <Alert kind="error" title="Could not load jobs" className="mb-6">
          {jobs.error.message}
        </Alert>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5">
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All ${counts.all}` },
              { value: 'active', label: `Active ${counts.active}` },
              { value: 'succeeded', label: `Completed ${counts.succeeded}` },
              { value: 'failed', label: `Failed ${counts.failed}` },
            ]}
          />
          {anyActive && <span className="text-xs text-zinc-500">Updating live</span>}
        </div>

        {jobs.loading && !jobs.data ? (
          <LoadingBlock label="Loading jobs" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-7 w-7" />}
            title={filter === 'all' ? 'No jobs yet' : 'No jobs match this filter'}
            description={filter === 'all' ? 'Upload a video to run the spotting pipeline on it.' : undefined}
            action={
              filter === 'all' && (
                <Button variant="primary" size="sm" onClick={() => navigate('/')}>
                  New analysis
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr className="border-b border-zinc-200 text-left">
                  <th className="px-4 py-2 font-medium">Video</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Config</th>
                  <th className="px-4 py-2 text-right font-medium">Tracks</th>
                  <th className="px-4 py-2 text-right font-medium">Duration</th>
                  <th className="px-4 py-2 text-right font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((j) => (
                  <tr key={j.id} className="group cursor-pointer hover:bg-zinc-50" onClick={() => navigate(`/jobs/${j.id}`)}>
                    <td className="max-w-[18rem] px-4 py-2.5">
                      <Link
                        to={`/jobs/${j.id}`}
                        className="block truncate font-medium text-zinc-900 group-hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {j.filename}
                      </Link>
                      <div className="num truncate text-xs text-zinc-500">
                        {formatBytes(j.size_bytes)} · {jobSubtitle(j)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-zinc-700">
                      {configLabel(j.config)}
                      <span className="ml-1.5 font-sans text-zinc-400">{j.device}</span>
                    </td>
                    <td className="num px-4 py-2.5 text-right text-zinc-700">{j.summary?.tracks ?? '—'}</td>
                    <td className="num whitespace-nowrap px-4 py-2.5 text-right text-zinc-700">
                      {formatSeconds(jobDuration(j, now))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-zinc-500" title={formatDate(j.created_at)}>
                      {formatRelative(j.created_at, now)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
