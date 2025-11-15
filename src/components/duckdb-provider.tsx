import { createContext, useContext } from 'react';
import { useDuckDb } from 'duckdb-wasm-kit';

type DuckDBContextValue = ReturnType<typeof useDuckDb>;

const DuckDBContext = createContext<DuckDBContextValue | null>(null);

export function DuckDBProvider({ children }: { children: React.ReactNode }) {
  const duckDbValue = useDuckDb();

  return (
    <DuckDBContext.Provider value={duckDbValue}>
      {children}
    </DuckDBContext.Provider>
  );
}

export function useDuckDbContext() {
  const context = useContext(DuckDBContext);

  if (context === null) {
    throw new Error('useDuckDbContext must be used within a DuckDBProvider');
  }

  return context;
}
