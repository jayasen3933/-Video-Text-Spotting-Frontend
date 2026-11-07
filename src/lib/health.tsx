import { createContext, useContext, type ReactNode } from 'react';
import { api, type Health } from './api';
import { useAsync } from './hooks';

interface HealthState {
  health: Health | undefined;
  offline: boolean;
  loading: boolean;
  reload: () => Promise<void>;
}

const HealthContext = createContext<HealthState>({
  health: undefined,
  offline: false,
  loading: true,
  reload: async () => {},
});

export function HealthProvider({ children }: { children: ReactNode }) {
  const { data, error, loading, reload } = useAsync(api.health, [], { intervalMs: 15000 });
  return (
    <HealthContext.Provider value={{ health: error ? undefined : data, offline: !!error, loading, reload }}>
      {children}
    </HealthContext.Provider>
  );
}

export const useHealth = () => useContext(HealthContext);
