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
