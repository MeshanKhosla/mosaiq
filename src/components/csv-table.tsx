import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface CsvTableProps {
  datasourceId: Id<'datasources'>;
}

export function CsvTable({ datasourceId }: CsvTableProps) {
  const datasource = useQuery(api.datasources.get, { id: datasourceId });

  if (!datasource) {
    return <div className="text-sm text-muted-foreground">Loading CSV...</div>;
  }

  if (!datasource.data || datasource.data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No data available</div>
    );
  }

  // Get headers from first row
  const headers =
    datasource.data.length > 0 ? Object.keys(datasource.data[0]) : [];

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
          {datasource.data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/50">
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
