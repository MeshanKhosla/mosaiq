import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import type { ColumnType } from '~/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { ColumnHeader } from '~/components/data-table/column-header';
import { DataTableCell } from '~/components/data-table/table-cell';
import { DataTableSkeleton } from '~/components/data-table/skeleton';
import { DataTablePagination } from '~/components/data-table/pagination';

interface DataTableProps {
  datasourceId: Id<'datasources'>;
  searchValue?: string;
}

export function DataTable({ datasourceId, searchValue = '' }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const datasource = useQuery(api.datasources.get, { id: datasourceId });
  const updateColumnType = useMutation(api.datasources.updateColumnType);

  const columnTypes = datasource?.columnTypes ?? {};

  // Create columns from data keys
  const columns = useMemo<
    Array<ColumnDef<Record<string, string | number>>>
  >(() => {
    if (!datasource?.data || datasource.data.length === 0) {
      return [];
    }

    const keys = Object.keys(datasource.data[0]);
    return keys.map((key) => {
      const columnType =
        (columnTypes[key] as ColumnType | undefined) || 'string';
      return {
        id: key, // Explicitly set column ID
        accessorKey: key,
        enableHiding: true, // Explicitly enable hiding
        header: ({ column }) => (
          <ColumnHeader
            column={column}
            columnName={key}
            columnType={columnType}
            datasourceId={datasourceId}
            updateColumnType={updateColumnType}
          />
        ),
        cell: ({ row }) => {
          const value = row.getValue(key);
          return <DataTableCell value={value} columnType={columnType} />;
        },
      };
    });
  }, [datasource, columnTypes, datasourceId, updateColumnType]);

  const table = useReactTable({
    data: datasource?.data || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: () => {},
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter: searchValue,
    },
  });

  if (!datasource) {
    return <DataTableSkeleton />;
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 &&
            table.getVisibleFlatColumns().length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={
                    table.getVisibleFlatColumns().length || columns.length
                  }
                  className="h-24 text-center"
                >
                  {table.getVisibleFlatColumns().length === 0
                    ? 'No columns selected'
                    : 'No results.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
