const SQL_RESERVED_WORDS = new Set([
  'select',
  'from',
  'where',
  'group',
  'order',
  'by',
  'as',
  'and',
  'or',
  'not',
  'in',
  'exists',
  'between',
  'like',
  'is',
  'null',
  'join',
  'inner',
  'left',
  'right',
  'outer',
  'on',
  'having',
  'limit',
  'offset',
]);

export function escapeColumnName(name: string): string {
  if (
    /[^a-zA-Z0-9_]/.test(name) ||
    /^\d/.test(name) ||
    SQL_RESERVED_WORDS.has(name.toLowerCase())
  ) {
    return `"${name.replace(/"/g, '""')}"`;
  }
  return name;
}

export function escapeTableName(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
