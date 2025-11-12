import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';
import type { Table, Vector } from 'apache-arrow';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

// utils/arrow.ts

export function arrowTo2Series(table?: Table): {
  labels: Array<string>;
  values: Array<number>;
} {
  if (!table || table.numCols < 2) return { labels: [], values: [] };

  const labels: Array<string> = [];
  const values: Array<number> = [];

  // loop over record batches (a table can be chunked)
  for (const batch of table.batches) {
    const dimVec: Vector = batch.getChildAt(0)!; // first column (dimension)
    const valVec: Vector = batch.getChildAt(1)!; // second column (value)

    const n = batch.numRows;
    for (let i = 0; i < n; i++) {
      // Arrow vectors are typed; get(i) is O(1) and safe even with nulls
      const dim = dimVec.get(i);
      const val = valVec.get(i);
      labels.push(String(dim ?? ''));
      values.push(Number(val ?? 0));
    }
  }
  return { labels, values };
}
