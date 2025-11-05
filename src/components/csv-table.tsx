import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface CsvTableProps {
  datasourceId: Id<'datasources'>;
}

export function CsvTable({ datasourceId }: CsvTableProps) {
  const [csvData, setCsvData] = React.useState<Array<Array<string>> | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fileUrl = useQuery(api.datasources.getFileUrl, { id: datasourceId });

  React.useEffect(() => {
    if (!fileUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch the CSV file content
    fetch(fileUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }
        return response.text();
      })
      .then((text) => {
        // Parse CSV (simple parsing - handles quoted fields)
        const rows: Array<Array<string>> = [];
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

        for (const line of lines) {
          const row: Array<string> = [];
          let current = '';
          let insideQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
              if (insideQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
              } else {
                // Toggle quote state
                insideQuotes = !insideQuotes;
              }
            } else if (char === ',' && !insideQuotes) {
              // Field separator
              row.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          // Add last field
          row.push(current.trim());
          rows.push(row);
        }

        setCsvData(rows);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load CSV');
        setLoading(false);
      });
  }, [fileUrl]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading CSV...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!csvData || csvData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No data available</div>
    );
  }

  const headers = csvData[0] || [];
  const rows = csvData.slice(1);

  return (
    <div className="w-full overflow-auto">
      <table className="w-full border-collapse border border-border">
        <thead>
          <tr className="bg-muted">
            {headers.map((header, index) => (
              <th
                key={index}
                className="border border-border px-4 py-2 text-left font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/50">
              {headers.map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="border border-border px-4 py-2 text-sm"
                >
                  {row[colIndex] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
