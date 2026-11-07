import { useEffect, useRef, useState, type DragEvent } from 'react';
import { FileVideo, UploadCloud, X } from 'lucide-react';
import { formatBytes } from '../lib/format';
import { cx } from './ui';

export const ACCEPTED = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];

export function Dropzone({
  file,
  onFile,
  disabled,
  error,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Local preview of the selected file; formats the browser cannot decode (e.g. some AVI/MKV) just show no preview.
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) pick(e.dataTransfer.files);
  };

  if (file) {
    return (
      <div className="overflow-hidden rounded-md border border-zinc-200">
        {preview && (
          <div className="flex justify-center bg-zinc-950">
            <video
              src={preview}
              controls
              muted
              playsInline
              preload="metadata"
              className="max-h-[50vh] w-auto max-w-full"
              onError={() => setPreview(null)}
            />
          </div>
        )}
      <div className="flex items-center gap-3 bg-zinc-50 px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white">
          <FileVideo className="h-5 w-5 text-zinc-500" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-900">{file.name}</div>
          <div className="num text-xs text-zinc-500">
            {formatBytes(file.size)} · {file.type || 'video'}
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onFile(null)}
            className="focus-ring rounded p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cx(
          'focus-ring flex w-full flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors',
          over ? 'border-accent-500 bg-accent-50/60' : 'border-zinc-300 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50',
          error && 'border-red-300',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <UploadCloud className="h-6 w-6 text-zinc-400" strokeWidth={1.5} />
        <div className="mt-3 text-sm text-zinc-700">
          <span className="font-medium text-zinc-900">Choose a video</span> or drag it here
        </div>
        <div className="mt-1 text-xs text-zinc-500">{ACCEPTED.join(', ').toUpperCase().replace(/\./g, '')}</div>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(',') + ',video/*'}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
