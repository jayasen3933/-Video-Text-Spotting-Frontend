import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

const KEY = 'logo-theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage blocked */
  }
  return 'system';
}

const resolve = (p: ThemePref): Resolved => (p === 'system' ? (media().matches ? 'dark' : 'light') : p);

function apply(r: Resolved) {
  const root = document.documentElement;
  root.classList.toggle('dark', r === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'dark' ? '#09090b' : '#fafafa');
}

interface ThemeState {
  pref: ThemePref;
  resolved: Resolved;
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeState>({ pref: 'system', resolved: 'light', setPref: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [resolved, setResolved] = useState<Resolved>(() => resolve(readPref()));

  useEffect(() => {
    const r = resolve(pref);
    setResolved(r);
    apply(r);
    if (pref !== 'system') return;
    const m = media();
    const onChange = () => {
      const next = m.matches ? 'dark' : 'light';
      setResolved(next);
      apply(next);
    };
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
  }, []);

  return <ThemeContext.Provider value={{ pref, resolved, setPref }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
