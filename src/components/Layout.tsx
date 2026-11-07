import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ListVideo, Menu, Monitor, Moon, Sun, Upload, X } from 'lucide-react';
import { useHealth } from '../lib/health';
import { useTheme, type ThemePref } from '../lib/theme';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'New analysis', icon: Upload, end: true },
  { to: '/jobs', label: 'Jobs', icon: ListVideo },
];

const THEMES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-zinc-900" />
        <path d="M8 9.5 23.5 7.5 24 22.5 8.5 24.5Z" fill="none" className="stroke-white" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="23.5" cy="7.5" r="2.6" className="fill-accent-500" />
      </svg>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight text-zinc-900">LOGO</div>
        <div className="text-2xs text-zinc-500">Video Text Spotting</div>
      </div>
    </div>
  );
}

/** Light / Dark / System switch for the sidebar footer. */
function ThemeSwitch() {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
      {THEMES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          title={`${label} theme`}
          onClick={() => setPref(value)}
          className={cx(
            'focus-ring flex items-center justify-center gap-1.5 rounded py-1 text-2xs font-medium transition-colors',
            pref === value ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-500 hover:text-zinc-900',
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          {label}
        </button>
      ))}
    </div>
  );
}

/** Compact light/dark toggle for the mobile top bar. */
function ThemeToggle() {
  const { resolved, setPref } = useTheme();
  const Icon = resolved === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      className="focus-ring rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
      onClick={() => setPref(resolved === 'dark' ? 'light' : 'dark')}
      aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}

function ConnectionStatus() {
  const { health, offline, loading } = useHealth();
  let dot = 'bg-zinc-300';
  let pulse = false;
  let label = 'Connecting…';
  let detail: string | null = null;
  if (offline) {
    dot = 'bg-red-500';
    label = 'API offline';
    detail = 'Start scripts/serve_api.py';
  } else if (health && !health.model.ready) {
    dot = 'bg-amber-500';
    label = 'Model not installed';
    detail = health.pipeline.available
      ? `${health.model.missing.length} trained file${health.model.missing.length === 1 ? '' : 's'} missing`
      : 'Pipeline import failed';
  } else if (health) {
    dot = 'bg-emerald-500';
    label = health.busy ? 'Connected · processing' : 'Connected';
    pulse = health.busy;
    detail = health.device.cuda ? (health.device.name ?? 'CUDA GPU') : 'CPU only';
  } else if (!loading) {
    label = 'Unknown';
  }
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
        <span className="relative flex h-2 w-2">
          {pulse && <span className={cx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', dot)} />}
          <span className={cx('relative inline-flex h-2 w-2 rounded-full', dot)} />
        </span>
        {label}
      </div>
      {detail && <div className="mt-0.5 truncate pl-4 text-2xs text-zinc-500">{detail}</div>}
      {health && <div className="mt-0.5 pl-4 text-2xs text-zinc-400">API v{health.version}</div>}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-zinc-200 px-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        <div className="px-2.5 pb-1.5 pt-2 text-2xs font-medium uppercase tracking-wider text-zinc-400">Workspace</div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'focus-ring relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-zinc-100 font-medium text-zinc-900 before:absolute before:inset-y-1.5 before:-left-2 before:w-0.5 before:rounded-full before:bg-accent-500'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cx('h-4 w-4', isActive ? 'text-zinc-900' : 'text-zinc-400')} strokeWidth={1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 p-3">
        <ThemeSwitch />
        <ConnectionStatus />
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-zinc-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            className="focus-ring rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-zinc-200 bg-white">
            <button
              className="focus-ring absolute right-3 top-3.5 rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
