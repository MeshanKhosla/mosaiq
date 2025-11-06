import type { ColumnType } from '../../lib/types';

export function isValidType(value: unknown, type: ColumnType): boolean {
  if (value === null || value === undefined || value === '') {
    return true; // Empty values are valid
  }

  const strValue = String(value).trim();
  if (strValue === '') {
    return true;
  }

  switch (type) {
    case 'number': {
      const num = Number(strValue);
      return !isNaN(num) && isFinite(num);
    }
    case 'date': {
      const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/;
      return datePattern.test(strValue);
    }
    case 'string':
      return true;
    default:
      return true;
  }
}
