import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';
import type { Table, Vector } from 'apache-arrow';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

export function arrowTo2Series(table?: Table): {
  labels: Array<string>;
  values: Array<number>;
} {
  if (!table || table.numCols < 2) return { labels: [], values: [] };

  const labels: Array<string> = [];
  const values: Array<number> = [];

  for (const batch of table.batches) {
    const dimVec: Vector = batch.getChildAt(0)!;
    const valVec: Vector = batch.getChildAt(1)!;

    const n = batch.numRows;
    for (let i = 0; i < n; i++) {
      const dim = dimVec.get(i);
      const val = valVec.get(i);
      labels.push(String(dim ?? ''));
      values.push(Number(val ?? 0));
    }
  }
  return { labels, values };
}

export function arrowToTableData(table?: Table): Array<Record<string, any>> {
  if (!table || table.numCols === 0) return [];

  const result: Array<Record<string, any>> = [];
  const columnNames = table.schema.fields.map((field) => field.name);

  for (const batch of table.batches) {
    const n = batch.numRows;
    const numCols = batch.numCols;

    for (let i = 0; i < n; i++) {
      const row: Record<string, any> = {};
      for (let j = 0; j < numCols; j++) {
        const vec: Vector = batch.getChildAt(j)!;
        const value = vec.get(i);
        const columnName = columnNames[j] ?? `column_${j}`;

        if (value === null || value === undefined) {
          row[columnName] = null;
        } else {
          const numValue = Number(value);
          if (
            !isNaN(numValue) &&
            isFinite(numValue) &&
            String(value).trim() === String(numValue)
          ) {
            row[columnName] = numValue;
          } else {
            row[columnName] = String(value);
          }
        }
      }
      result.push(row);
    }
  }

  return result;
}
