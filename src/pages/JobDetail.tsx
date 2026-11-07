import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Download, FileJson, RefreshCw, Terminal, Trash2 } from 'lucide-react';
import { api, type Job, type Track } from '../lib/api';
import { STAGE_LABELS, configLabel, detectorLabel, formatBytes, formatDate, formatNumber, formatSeconds, jobDuration } from '../lib/format';
import { useAsync, useNow } from '../lib/hooks';
import { StageProgress } from '../components/StageProgress';
import { TrackTimeline } from '../components/TrackTimeline';
import { TracksTable } from '../components/TracksTable';
import { VideoViewer, type VideoViewerHandle } from '../components/VideoViewer';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  KeyValue,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Stat,
  StatusBadge,
} from '../components/ui';

function LogPanel({ jobId, live }: { jobId: string; live: boolean }) {
  const log = useAsync(() => api.log(jobId), [jobId], { intervalMs: 3000, poll: live });
  const pre = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (pre.current) pre.current.scrollTop = pre.current.scrollHeight;
  }, [log.data]);
  return (
    <pre
      ref={pre}
      className="max-h-80 overflow-auto bg-ink px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-fg"
    >
      {log.data?.trim() || (log.loading ? 'Loading…' : 'No log output yet.')}
    </pre>
  );
}

function ProgressSection({ job, now }: { job: Job; now: number }) {
  const elapsed = jobDuration(job, now);
  let headline: string;
  if (job.status === 'queued') {
    headline = job.queue_position && job.queue_position > 1
      ? `Waiting in queue · ${job.queue_position - 1} job${job.queue_position > 2 ? 's' : ''} ahead`
      : 'Waiting for the worker';
  } else if (job.status === 'running') {
    const p = job.progress;
    if (p?.stage === 'render' && p.total === 0) headline = 'Preparing browser-playable videos';
    else if (job.stage) {
      headline = STAGE_LABELS[job.stage].hint;
      if (p && p.stage === job.stage && p.total > 0) headline += ` · ${Math.round((100 * p.done) / p.total)}%`;
    } else headline = 'Loading models (first run downloads them)';
  } else if (job.status === 'failed') {
    headline = job.stage ? `Failed during ${STAGE_LABELS[job.stage].label.toLowerCase()}` : 'Failed before the pipeline started';
  } else {
    headline = 'All stages completed';
  }
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-zinc-900">{headline}</h2>
        {elapsed != null && <span className="num text-xs text-zinc-500">Elapsed {formatSeconds(elapsed)}</span>}
      </div>
      <StageProgress job={job} now={now} />
    </section>
  );
}

function Results({ job }: { job: Job }) {
  const result = useAsync(() => api.result(job.id), [job.id]);
  const viewer = useRef<VideoViewerHandle>(null);
  const [frame, setFrame] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const visible = useMemo(
    () => new Set((result.data?.frames[String(frame)] ?? []).map((b) => b.t)),
    [result.data, frame],
  );
  const onSelectRow = useCallback((t: Track) => {
    setSelected((s) => (s === t.id ? null : t.id));
    viewer.current?.seekToFrame(t.first_frame);
  }, []);
  const onSeek = useCallback((f: number) => viewer.current?.seekToFrame(f), []);

  if (result.loading && !result.data) return <LoadingBlock label="Loading results" />;
  if (result.error || !result.data) {
    return (
      <Alert kind="error" title="Could not load results">
        {result.error?.message}
      </Alert>
    );
  }
  const r = result.data;

  return (
    <div className="space-y-6">
      <VideoViewer
        ref={viewer}
        sourceUrl={api.videoUrl(job.id, 'source')}
        outputUrl={api.videoUrl(job.id, 'output')}
        outputDownloadUrl={api.videoUrl(job.id, 'output', true)}
        webVideo={job.web_video}
        result={r}
        selectedTrack={selected}
        hoveredTrack={hovered}
        onSelectTrack={setSelected}
        onFrame={setFrame}
      />

      <Card>
        <CardHeader
          title="Track timeline"
          description="Each bar is one track across the clip. Click a bar to jump to its first frame, or anywhere to seek."
        />
        <div className="px-4 py-4">
          {r.tracks.length ? (
            <TrackTimeline
              tracks={r.tracks}
              numFrames={r.num_frames}
              frame={frame}
              selected={selected}
              onSeek={onSeek}
              onSelect={setSelected}
              onHover={setHovered}
            />
          ) : (
            <p className="text-xs text-zinc-500">No tracks.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Tracks" description="Voted transcription per track. Select a row to highlight it and jump to it." />
        <TracksTable
          tracks={r.tracks}
          fps={r.fps || 25}
          visible={visible}
          selected={selected}
          onSelect={onSelectRow}
          onHover={setHovered}
        />
      </Card>
    </div>
  );
}

export default function JobDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState(true);
  const job = useAsync(() => api.job(id), [id], { intervalMs: 1500, poll: active });
  const [showLog, setShowLog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const j = job.data;
  const isActive = !j || j.status === 'queued' || j.status === 'running';
  useEffect(() => setActive(isActive), [isActive]);
  const now = useNow(1000, isActive);

  useEffect(() => {
    if (j?.status === 'failed') setShowLog(true);
  }, [j?.status]);

  if (job.loading && !j) return <LoadingBlock label="Loading job" />;
  if (!j) {
    return (
      <>
        <PageHeader title="Job not found" breadcrumb={<Link to="/jobs" className="hover:text-zinc-900">Jobs</Link>} />
        <Alert kind="error" title="Could not load this job" action={<Button size="sm" onClick={() => navigate('/jobs')}>Back to jobs</Button>}>
          {job.error?.message}
        </Alert>
      </>
    );
  }

  const s = j.summary;

  const remove = async () => {
    if (!window.confirm(`Delete the job for "${j.filename}" and all of its files?`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteJob(j.id);
      navigate('/jobs');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/jobs" className="inline-flex items-center gap-1 hover:text-zinc-900">
            <ChevronLeft className="h-3.5 w-3.5" /> Jobs
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{j.filename}</span>
            <StatusBadge status={j.status} />
          </span>
        }
        description={
          <span className="num">
            <span className="font-mono">{configLabel(j.config)}</span> · submitted {formatDate(j.created_at)} · {formatBytes(j.size_bytes)}
          </span>
        }
        actions={
          j.status === 'succeeded' ? (
            <>
              <LinkButton href={api.resultUrl(j.id)} download icon={<FileJson className="h-4 w-4" />}>
                Tracks JSON
              </LinkButton>
              <LinkButton variant="primary" href={api.videoUrl(j.id, 'output', true)} download icon={<Download className="h-4 w-4" />}>
                Download video
              </LinkButton>
            </>
          ) : j.status === 'failed' ? (
            <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => navigate('/')}>
              New analysis
            </Button>
          ) : null
        }
      />

      <div className="space-y-6">
        {j.status !== 'succeeded' && <ProgressSection job={j} now={now} />}

        {j.status === 'failed' && j.error && (
          <Alert kind="error" title="The pipeline stopped with an error">
            <code className="block whitespace-pre-wrap break-words font-mono">{j.error}</code>
          </Alert>
        )}
        {deleteError && <Alert kind="error" title="Could not delete the job">{deleteError}</Alert>}

        {j.status === 'succeeded' && s && (
          <>
            <Card className="grid grid-cols-2 divide-x divide-y divide-zinc-100 sm:grid-cols-4 sm:divide-y-0">
              <Stat label="Tracks" value={formatNumber(s.tracks)} hint={`${formatNumber(s.boxes)} boxes`} />
              <Stat label="Frames" value={formatNumber(s.frames)} hint={`${s.width}×${s.height} @ ${s.video_fps.toFixed(2)} fps`} />
              <Stat label="Throughput" value={`${s.fps_pipeline.toFixed(2)} fps`} hint={`${s.fps_total.toFixed(2)} fps end-to-end`} />
              <Stat
                label="Processing time"
                value={formatSeconds(jobDuration(j))}
                hint={`${s.device.toUpperCase()} · ${detectorLabel(s.detector)}`}
              />
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <Results job={j} />
              <aside className="space-y-6">
                <Card>
                  <CardHeader title="Stage timings" />
                  <KeyValue
                    items={Object.entries(STAGE_LABELS).map(([k, v]) => [v.label, formatSeconds(s.seconds[k as keyof typeof s.seconds])])}
                  />
                </Card>
                <Card>
                  <CardHeader title="Run details" />
                  <KeyValue
                    items={[
                      ['Config', <span className="font-mono">{configLabel(j.config)}</span>],
                      ['Experiment', <span className="font-mono">{s.source_exp}</span>],
                      ['Detector', detectorLabel(s.detector)],
                      ['Track voting', s.voting ? 'Enabled' : 'Disabled'],
                      ...(s.step ? [['Frames analysed', s.step > 1 ? `1 in ${s.step} (${s.mode})` : `all (${s.mode})`] as [string, string]] : []),
                      ['Device', s.device],
                      ['Job ID', <span className="font-mono">{j.id}</span>],
                    ]}
                  />
                </Card>
                {s.longest_track && (
                  <Card>
                    <CardHeader title="Longest track" />
                    <KeyValue
                      items={[
                        ['Track', <span className="font-mono">#{s.longest_track.track_id}</span>],
                        ['Text', <span className="font-mono">{s.longest_track.text || '—'}</span>],
                        ['Boxes', s.longest_track.boxes],
                        ['Frames', `${s.longest_track.first_frame}–${s.longest_track.last_frame}`],
                      ]}
                    />
                  </Card>
                )}
              </aside>
            </div>
          </>
        )}

        <Card className="overflow-hidden">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Terminal className="h-4 w-4 text-zinc-400" /> Pipeline log
              </span>
            }
            actions={
              <Button size="sm" variant="ghost" onClick={() => setShowLog((v) => !v)}>
                {showLog ? 'Hide' : 'Show'}
              </Button>
            }
          />
          {showLog && <LogPanel jobId={j.id} live={isActive} />}
        </Card>

        {!isActive && (
          <div className="flex justify-end">
            <Button variant="danger" size="sm" loading={deleting} icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remove}>
              Delete job
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
