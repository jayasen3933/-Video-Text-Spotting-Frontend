import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { STAGE_LABELS } from '../lib/format';
import { useAsync } from '../lib/hooks';
import { useHealth } from '../lib/health';
import { ACCEPTED, Dropzone } from '../components/Dropzone';
import { JobList } from '../components/JobList';
import { Alert, Button, Card, CardHeader, EmptyState, LoadingBlock, PageHeader } from '../components/ui';

/** Why the trained model cannot run, with the exact files the backend is missing. */
function ModelNotReady() {
  const { health, reload, loading } = useHealth();
  if (!health || health.model.ready) return null;
  const m = health.model;
  return (
    <Alert
      kind="error"
      title={`The trained ${m.config} model is not installed on the server`}
      className="mb-6"
      action={
        <Button size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} loading={loading} onClick={() => void reload()}>
          Check again
        </Button>
      }
    >
      {!health.pipeline.available ? (
        <>
          The pipeline cannot be imported in the backend environment:{' '}
          <code className="break-words font-mono">{health.pipeline.error}</code>
        </>
      ) : !m.found ? (
        <>
          <code className="font-mono">{m.file}</code> does not exist in the backend repository.
        </>
      ) : (
        <>
          <p>
            Analysis is unavailable until these files exist in the backend repository (paths relative to{' '}
            <code className="font-mono">Video-Text-Spotting/</code>):
          </p>
          <ul className="mt-2 space-y-1.5">
            {m.missing.map((r) => (
              <li key={r.component}>
                <code className="break-all font-mono font-medium">{r.path ?? `${r.component} (not configured)`}</code>
                <div className="text-xs opacity-80">{r.hint}</div>
              </li>
            ))}
          </ul>
          <p className="mt-2">Copy the checkpoints from where they were trained, then select Check again.</p>
        </>
      )}
    </Alert>
  );
}

export default function NewAnalysis() {
  const navigate = useNavigate();
  const { health, offline } = useHealth();
  const recent = useAsync(api.jobs, [], { intervalMs: 5000 });

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => () => abortRef.current?.(), []);

  const uploading = progress !== null;
  const ready = !!health?.model.ready && !offline;
  const blocker = offline
    ? 'API server offline'
    : !health
      ? 'Connecting to the API…'
      : !ready
        ? 'Trained model not installed'
        : !file
          ? 'Select a video first'
          : null;

  const onFile = (f: File | null) => {
    setSubmitError(null);
    if (f && !ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setFileError(`Unsupported file type. Use one of: ${ACCEPTED.join(', ')}`);
      setFile(null);
      return;
    }
    if (f && f.size === 0) {
      setFileError('This file is empty.');
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !ready) return;
    setSubmitError(null);
    setProgress(0);
    const { promise, abort } = api.createJob(file, setProgress);
    abortRef.current = abort;
    try {
      const job = await promise;
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <>
      <PageHeader
        title="New analysis"
        description="Upload a video to detect, read and track every piece of text in it. Each track gets a stable ID and a single voted transcription."
      />

      {offline && (
        <Alert kind="error" title="Cannot reach the API server" className="mb-6">
          Start the backend with <code className="font-mono">python scripts/serve_api.py</code> in the
          Video-Text-Spotting repository. This page reconnects automatically.
        </Alert>
      )}
      {!offline && <ModelNotReady />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={submit} className="space-y-6">
          <Card>
            <CardHeader title="Video" description="A single clip. Every frame is processed, so shorter clips finish faster." />
            <div className="p-4">
              <Dropzone file={file} onFile={onFile} disabled={uploading} error={fileError} />
            </div>
          </Card>

          {submitError && <Alert kind="error" title="Could not start the analysis">{submitError}</Alert>}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {uploading ? (
              <div className="flex flex-1 items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-[width] duration-150"
                    style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
                  />
                </div>
                <span className="num w-24 text-right text-xs text-zinc-500">
                  {progress! < 1 ? `Uploading ${Math.round(progress! * 100)}%` : 'Starting…'}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => abortRef.current?.()}>
                  Cancel
                </Button>
              </div>
            ) : (
              blocker && <span className="text-xs text-zinc-500">{blocker}</span>
            )}
            <Button
              type="submit"
              variant="primary"
              loading={uploading}
              disabled={uploading || !!blocker}
              icon={!uploading && <ArrowRight className="h-4 w-4" />}
              className="flex-row-reverse"
            >
              Start analysis
            </Button>
          </div>
        </form>

        <aside className="space-y-6">
          <Card>
            <CardHeader
              title="Recent jobs"
              actions={
                <Link to="/jobs" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                  View all
                </Link>
              }
            />
            {recent.data && recent.data.length > 0 ? (
              <JobList jobs={recent.data.slice(0, 5)} />
            ) : recent.loading ? (
              <LoadingBlock />
            ) : (
              <EmptyState icon={<Inbox className="h-6 w-6" />} title="No jobs yet" description="Submitted videos appear here." />
            )}
          </Card>

          <Card>
            <CardHeader title="Pipeline" />
            <ol className="space-y-2.5 px-4 py-3">
              {Object.entries(STAGE_LABELS).map(([key, s], i) => (
                <li key={key} className="flex gap-3 text-xs">
                  <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-2xs font-medium text-zinc-500">
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <span className="font-medium text-zinc-800">{s.label}</span>
                    <span className="text-zinc-500"> · {s.hint}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
