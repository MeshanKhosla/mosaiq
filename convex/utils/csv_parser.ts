/**
 * CSV parsing utilities
 */

/**
 * Parses a CSV line, handling quoted fields and escaped quotes
 * @param line - The CSV line to parse
 * @returns Array of parsed field values
 */
export function parseCsvLine(line: string): Array<string> {
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
