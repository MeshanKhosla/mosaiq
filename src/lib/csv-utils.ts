import { insertFile } from 'duckdb-wasm-kit';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import type { ColumnType } from './types';

export async function parseCsvColumnTypesWithDuckDB(
  db: AsyncDuckDB,
  csvContent: string,
): Promise<Record<string, ColumnType>> {
  const tempTableName = `temp_upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const escapedTableName = `"${tempTableName}"`;
  const file = new File([csvContent], 'data.csv', { type: 'text/csv' });
  let conn: any = null;

  try {
    await insertFile(db, file, tempTableName);

    conn = await db.connect();
    const result = await conn.query(`DESCRIBE ${escapedTableName}`);

    const columnTypes: Record<string, ColumnType> = {};

    for (const row of result.toArray()) {
      const columnName = row.column_name as string;
      const duckDbType = (row.column_type as string).toLowerCase();

      if (duckDbType.includes('date') || duckDbType.includes('timestamp')) {
        columnTypes[columnName] = 'date';
      } else if (
        duckDbType.includes('int') ||
        duckDbType.includes('double') ||
        duckDbType.includes('float') ||
        duckDbType.includes('decimal') ||
        duckDbType.includes('numeric')
      ) {
        columnTypes[columnName] = 'number';
      } else {
        columnTypes[columnName] = 'string';
      }
    }

    await conn.query(`DROP TABLE IF EXISTS ${escapedTableName}`);
    await conn.close();

    return columnTypes;
  } catch (err) {
    if (conn) {
      try {
        await conn.query(`DROP TABLE IF EXISTS ${escapedTableName}`);
        await conn.close();
      } catch {
        /* Ignore cleanup errors */
      }
    }
    throw err;
  }
}
