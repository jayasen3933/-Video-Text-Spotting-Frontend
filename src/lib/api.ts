export const STAGES = ['extract', 'det', 'lsc', 'fuse', 'track', 'vote', 'render'] as const;
export type Stage = (typeof STAGES)[number];
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type Device = 'auto' | 'cuda' | 'cpu';
export type Mode = 'fast' | 'accurate';

export interface ModelRequirement {
  component: string;
  /** relative to the backend root */
  path: string | null;
  ok: boolean;
  /** how to produce the artifact */
  hint: string;
}

/** The trained config the backend serves (configs/FINAL.yaml by default). */
export interface ServedModel {
  config: string;
  file: string;
  found: boolean;
  requirements: ModelRequirement[];
  missing: ModelRequirement[];
  ready: boolean;
}

export interface Health {
  version: string;
  model: ServedModel;
  pipeline: { available: boolean; error: string | null };
  device: { cuda: boolean; name: string | null };
  ffmpeg: boolean;
  busy: boolean;
}

export interface LongestTrack {
  track_id: number;
  boxes: number;
  first_frame: number;
  last_frame: number;
  text: string;
}

export interface JobSummary {
  source_exp: string;
  detector: string;
  mode?: Mode;
  step?: number;
  device: string;
  voting: boolean;
  frames: number;
  width: number;
  height: number;
  video_fps: number;
  tracks: number;
  boxes: number;
  longest_track: LongestTrack | null;
  seconds: Partial<Record<Stage, number>>;
  fps_pipeline: number;
  fps_total: number;
}

export interface Job {
  id: string;
  filename: string;
  size_bytes: number;
  config: string;
  device: Device;
  mode?: Mode;
  progress: { stage: Stage; done: number; total: number } | null;
  status: JobStatus;
  stage: Stage | null;
  timeline: Partial<Record<Stage, number>>;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  summary: JobSummary | null;
  error: string | null;
  web_video: boolean;
  queue_position: number | null;
}

export interface Box {
  /** track id */
  t: number;
  /** quad x1,y1,...,x4,y4 in source pixels */
  q: number[];
  /** fused score */
  s: number;
}

export interface Track {
  id: number;
  text: string;
  first_frame: number;
  last_frame: number;
  boxes: number;
  mean_score: number;
}

export interface JobResult {
  fps: number;
  width: number;
  height: number;
  num_frames: number;
  tracks: Track[];
  texts: Record<string, string>;
  frames: Record<string, Box[]>;
}

const BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d: { msg: string }) => d.msg).join('; ');
  } catch {
    /* body is not JSON */
  }
  return `${res.status} ${res.statusText}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, init);
  } catch {
    throw new ApiError('Cannot reach the API server.', 0);
  }
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  health: () => request<Health>('/api/health'),
  jobs: () => request<Job[]>('/api/jobs'),
  job: (id: string) => request<Job>(`/api/jobs/${id}`),
  result: (id: string) => request<JobResult>(`/api/jobs/${id}/result`),
  log: (id: string, lines = 300) => request<string>(`/api/jobs/${id}/log?lines=${lines}`),
  deleteJob: (id: string) => request<void>(`/api/jobs/${id}`, { method: 'DELETE' }),
  videoUrl: (id: string, kind: 'source' | 'output', download = false) =>
    `${BASE}/api/jobs/${id}/video/${kind}${download ? '?download=true' : ''}`,
  resultUrl: (id: string) => `${BASE}/api/jobs/${id}/result`,

  /** Multipart upload through XHR so the caller gets upload progress. The backend runs its served trained
   * config (FINAL) on the best available device. */
  createJob(file: File, onProgress?: (fraction: number) => void): { promise: Promise<Job>; abort: () => void } {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<Job>((resolve, reject) => {
      const body = new FormData();
      body.append('video', file);
      xhr.open('POST', `${BASE}/api/jobs`);
      xhr.responseType = 'json';
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response as Job);
        const detail = (xhr.response as { detail?: unknown } | null)?.detail;
        reject(new ApiError(typeof detail === 'string' ? detail : `Upload failed (${xhr.status})`, xhr.status));
      };
      xhr.onerror = () => reject(new ApiError('Cannot reach the API server.', 0));
      xhr.onabort = () => reject(new ApiError('Upload cancelled.', 0));
      xhr.send(body);
    });
    return { promise, abort: () => xhr.abort() };
  },
};
