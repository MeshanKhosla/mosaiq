import { useEffect, useState } from 'react';
import { insertFile } from 'duckdb-wasm-kit';
import { toast } from 'sonner';
import { useDuckDbContext } from '~/components/duckdb-provider';

interface UseDuckDbTableOptions {
  csvData: string | undefined;
  tableName: string | undefined;
  enabled?: boolean;
}

export function useDuckDbTable({
  csvData,
  tableName,
  enabled = true,
}: UseDuckDbTableOptions) {
  const { db, loading: dbLoading, error: dbError } = useDuckDbContext();
  const [tableLoaded, setTableLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !db || !csvData || !tableName || tableLoaded) return;

    const loadData = async () => {
      try {
        const file = new File([csvData], 'data.csv', { type: 'text/csv' });

        try {
          await insertFile(db, file, tableName);
        } catch {
          /* Table may already exist */
        }

        const verifyTable = async () => {
          const conn = await db.connect();
          const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
          await conn.query(`SELECT 1 FROM ${escapedTableName} LIMIT 1`);
          await conn.close();
        };

        try {
          await verifyTable();
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100));
          await verifyTable();
        }

        setTableLoaded(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load CSV into DuckDB';
        console.error('Failed to load CSV into DuckDB:', err);
        toast.error('Failed to load data', {
          description: errorMessage,
        });
      }
    };

    loadData();
  }, [db, csvData, tableName, tableLoaded, enabled]);

  return {
    tableLoaded,
    dbLoading,
    dbError,
  };
}
