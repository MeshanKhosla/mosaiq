import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Skeleton } from '~/components/ui/skeleton';

interface TableVisualProps {
  visualId: Id<'visuals'>;
}

export function TableVisual({ visualId }: TableVisualProps) {
  const data = useQuery(api.visuals.getData, { visualId });

  if (data === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (data.type !== 'table' || data.rows.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
        No data to display. Select columns to show.
      </div>
    );
  }

  const displayRows = data.rows.slice(0, 100); // Limit to 100 rows

  return (
    <div className="w-full h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {data.columns.map((column) => (
              <TableHead key={column} className="font-semibold">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, index) => (
            <TableRow key={index}>
              {data.columns.map((column) => (
                <TableCell key={column}>
                  {typeof row[column] === 'number'
                    ? row[column].toLocaleString()
                    : row[column]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.rows.length > 100 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          Showing 100 of {data.rows.length} rows
        </div>
      )}
    </div>
  );
}
