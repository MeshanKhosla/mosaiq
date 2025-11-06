import { isValidType } from './utils';
import type { ColumnType } from '../../lib/types';

interface DataTableCellProps {
  value: unknown;
  columnType: ColumnType;
}

export function DataTableCell({ value, columnType }: DataTableCellProps) {
  const isValid = isValidType(value, columnType);
  return (
    <div
      className={`px-2 ${!isValid ? 'bg-destructive/10 text-destructive' : ''}`}
      title={!isValid ? `Invalid ${columnType} value` : ''}
    >
      {String(value || '')}
    </div>
  );
}
