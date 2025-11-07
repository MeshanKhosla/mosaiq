import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { useLocation } from '@tanstack/react-router';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { parseCsvToData } from '~/lib/file-utils';

interface CsvTableProps {
  datasourceId: Id<'datasources'>;
}

export function CsvTable({ datasourceId }: CsvTableProps) {
  const location = useLocation();
  const storageUrl = useQuery(api.datasources.getStorageUrl, {
    datasourceId,
  });
  const locationState = location.state as {
    csvData?: Array<Record<string, string | number>>;
  } | null;
  const [csvData, setCsvData] = useState<
    Array<Record<string, string | number>> | undefined
  >(locationState?.csvData);

  useEffect(() => {
    if (csvData !== undefined) {
      return;
    }

    if (storageUrl) {
      fetch(storageUrl)
        .then((res) => (res.ok ? res.text() : null))
        .then((text) => {
          if (text) {
            setCsvData(parseCsvToData(text));
          } else {
            setCsvData([]);
          }
        })
        .catch(() => setCsvData([]));
    }
  }, [csvData, storageUrl]);

  if (csvData === undefined) {
    return <div className="text-sm text-muted-foreground">Loading CSV...</div>;
  }

  if (csvData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No data available</div>
    );
  }

  // Get headers from first row
  const headers = Object.keys(csvData[0]);

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
          {csvData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:!bg-accent">
              {headers.map((header, colIndex) => (
                <td
                  key={colIndex}
                  className="border border-border px-4 py-2 text-sm"
                >
                  {String(row[header] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
