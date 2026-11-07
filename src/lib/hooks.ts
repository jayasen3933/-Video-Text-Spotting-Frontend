import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Runs `fn` on mount and whenever `deps` change. With `intervalMs`, re-runs it on that interval while
 * `poll` is true. Keeps the last good data while a refresh is in flight or fails.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  { intervalMs, poll = true }: { intervalMs?: number; poll?: boolean } = {},
): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    try {
      const value = await fnRef.current();
      if (id !== seq.current) return;
      setData(value);
      setError(undefined);
    } catch (e) {
      if (id !== seq.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!intervalMs || !poll) return;
    const t = window.setInterval(() => void reload(), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs, poll, reload]);

  return { data, error, loading, reload };
}

/** Re-renders every `ms` while enabled; returns the current time in epoch seconds. */
export function useNow(ms: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now() / 1000);
    const t = window.setInterval(() => setNow(Date.now() / 1000), ms);
    return () => window.clearInterval(t);
  }, [ms, enabled]);
  return now;
}
