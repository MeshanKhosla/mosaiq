export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCsvLine(line: string): Array<string> {
  const result: Array<string> = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsvForColumnTypes(
  csvContent: string,
): Record<string, 'string' | 'number' | 'date'> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = parseCsvLine(lines[0]);
  if (headers.length === 0) {
    throw new Error('CSV file has no headers');
  }

  const headerSet = new Set<string>();
  for (const header of headers) {
    if (!header || header.trim() === '') {
      throw new Error('CSV has empty headers');
    }
    if (headerSet.has(header)) {
      throw new Error(`CSV has duplicate header: ${header}`);
    }
    headerSet.add(header);
  }

  const columnTypeCounts: Record<
    string,
    { string: number; number: number; date: number }
  > = {};

  for (const header of headers) {
    columnTypeCounts[header] = { string: 0, number: 0, date: 0 };
  }

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    if (values.length !== headers.length) {
      throw new Error(
        `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`,
      );
    }

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const trimmedValue = String(values[j] || '').trim();

      if (trimmedValue === '') {
        columnTypeCounts[header].string++;
      } else {
        const numValue = Number(trimmedValue);
        const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/;
        if (datePattern.test(trimmedValue)) {
          columnTypeCounts[header].date++;
        } else if (!isNaN(numValue) && trimmedValue !== '') {
          columnTypeCounts[header].number++;
        } else {
          columnTypeCounts[header].string++;
        }
      }
    }
  }

  const columnTypes: Record<string, 'string' | 'number' | 'date'> = {};
  for (const header of headers) {
    const counts = columnTypeCounts[header];
    const total = counts.string + counts.number + counts.date;
    if (total === 0) {
      columnTypes[header] = 'string';
    } else if (counts.number > counts.string && counts.number > counts.date) {
      columnTypes[header] = 'number';
    } else if (counts.date > counts.string) {
      columnTypes[header] = 'date';
    } else {
      columnTypes[header] = 'string';
    }
  }

  return columnTypes;
}

export function parseCsvToData(
  csvContent: string,
): Array<Record<string, string | number>> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const data: Array<Record<string, string | number>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    if (values.length !== headers.length) {
      continue;
    }

    const row: Record<string, string | number> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value: string | number = values[j] || '';
      const trimmedValue = String(value).trim();

      if (trimmedValue !== '') {
        const numValue = Number(trimmedValue);
        if (!isNaN(numValue) && trimmedValue !== '') {
          value = numValue;
        }
      }

      row[header] = value;
    }
    data.push(row);
  }

  return data;
}
