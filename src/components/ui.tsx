import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import type { JobStatus } from '../lib/api';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------------------------------------- Button */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500',
  secondary:
    'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 disabled:text-zinc-400 disabled:hover:bg-white disabled:hover:border-zinc-300',
  ghost: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:text-zinc-300',
  danger: 'bg-white text-red-700 border border-zinc-300 hover:bg-red-50 hover:border-red-300 disabled:text-zinc-400',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'focus-ring inline-flex shrink-0 items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/** Anchor styled as a button (downloads, external links). */
export function LinkButton({
  href,
  children,
  icon,
  variant = 'secondary',
  size = 'md',
  download,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: Variant;
  size?: Size;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      download={download}
      className={cx(
        'focus-ring inline-flex shrink-0 items-center justify-center rounded-md font-medium transition-colors',
        variants[variant],
        sizes[size],
      )}
    >
      {icon}
      {children}
    </a>
  );
}

/* ---------------------------------------------------------------- Card */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-lg border border-zinc-200 bg-white', className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-start justify-between gap-4 border-b border-zinc-200 px-4 py-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Page header */

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumb && <div className="mb-2 text-xs text-zinc-500">{breadcrumb}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-zinc-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- Badges */

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

const tones: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  blue: 'bg-accent-50 text-accent-700 ring-accent-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200/70',
  red: 'bg-red-50 text-red-700 ring-red-200/70',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-2xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusMeta: Record<JobStatus, { tone: Tone; label: string }> = {
  queued: { tone: 'neutral', label: 'Queued' },
  running: { tone: 'blue', label: 'Running' },
  succeeded: { tone: 'green', label: 'Completed' },
  failed: { tone: 'red', label: 'Failed' },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const m = statusMeta[status];
  return (
    <Badge tone={m.tone}>
      {status === 'running' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span
          className={cx(
            'h-1.5 w-1.5 rounded-full',
            status === 'queued' && 'bg-zinc-400',
            status === 'succeeded' && 'bg-emerald-500',
            status === 'failed' && 'bg-red-500',
          )}
        />
      )}
      {m.label}
    </Badge>
  );
}

/* ---------------------------------------------------------------- Alerts, empty, loading */

const alertMeta = {
  info: { cls: 'border-zinc-200 bg-white text-zinc-700', Icon: Info, icon: 'text-zinc-400' },
  warning: { cls: 'border-amber-200 bg-amber-50/60 text-amber-900', Icon: AlertTriangle, icon: 'text-amber-500' },
  error: { cls: 'border-red-200 bg-red-50/60 text-red-900', Icon: XCircle, icon: 'text-red-500' },
  success: { cls: 'border-emerald-200 bg-emerald-50/60 text-emerald-900', Icon: CheckCircle2, icon: 'text-emerald-500' },
};

export function Alert({
  kind = 'info',
  title,
  children,
  action,
  className,
}: {
  kind?: keyof typeof alertMeta;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { cls, Icon, icon } = alertMeta[kind];
  return (
    <div className={cx('flex gap-3 rounded-lg border px-4 py-3', cls, className)}>
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', icon)} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        {children && <div className="mt-1 text-xs leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-zinc-300">{icon}</div>}
      <div className="text-sm font-medium text-zinc-900">{title}</div>
      {description && <p className="mt-1 max-w-sm text-xs text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('h-4 w-4 animate-spin text-zinc-400', className)} />;
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-xs text-zinc-500">
      <Spinner /> {label}
    </div>
  );
}

/* ---------------------------------------------------------------- Data display */

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="text-2xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="num mt-1 truncate text-lg font-semibold text-zinc-900">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-zinc-100">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-2 text-xs">
          <dt className="text-zinc-500">{k}</dt>
          <dd className="num min-w-0 truncate text-right font-medium text-zinc-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------- Segmented control */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean; title?: string }[];
  size?: Size;
}) {
  return (
    <div className="inline-flex rounded-md border border-zinc-300 bg-zinc-100 p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'focus-ring rounded-[5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-3 text-xs',
            value === o.value ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
