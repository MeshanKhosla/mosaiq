import type { Table } from '@tanstack/react-table';
import { Button } from '~/components/ui/button';

interface DataTablePaginationProps {
  table: Table<Record<string, string | number>>;
}

export function DataTablePagination({ table }: DataTablePaginationProps) {
  if (table.getVisibleFlatColumns().length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-end space-x-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length === 0 ? (
          'No rows'
        ) : (
          <>
            Showing{' '}
            {table.getRowModel().rows.length === 0
              ? 0
              : table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1}{' '}
            to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}{' '}
            of {table.getFilteredRowModel().rows.length} row(s)
          </>
        )}
      </div>
      <div className="space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
