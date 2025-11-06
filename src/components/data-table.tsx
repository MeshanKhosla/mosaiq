import { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import type { Id } from '../../convex/_generated/dataModel';

interface DataTableProps {
  datasourceId: Id<'datasources'>;
  searchValue?: string;
  onTableReady?: (
    table: ReturnType<typeof useReactTable<Record<string, string | number>>>,
  ) => void;
}

type ColumnType = 'string' | 'number' | 'date';

function isValidType(value: unknown, type: ColumnType): boolean {
  if (value === null || value === undefined || value === '') {
    return true; // Empty values are valid
  }

  const strValue = String(value).trim();
  if (strValue === '') {
    return true;
  }

  switch (type) {
    case 'number': {
      const num = Number(strValue);
      return !isNaN(num) && isFinite(num);
    }
    case 'date': {
      const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/;
      return datePattern.test(strValue);
    }
    case 'string':
      return true;
    default:
      return true;
  }
}

export function DataTable({
  datasourceId,
  searchValue = '',
  onTableReady,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const datasource = useQuery(api.datasources.get, { id: datasourceId });
  const updateColumnType = useMutation(api.datasources.updateColumnType);

  const columnTypes =
    (datasource?.columnTypes as Record<string, ColumnType> | undefined) || {};

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
        accessorKey: key,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 px-2 lg:px-3 w-full justify-start"
                >
                  <span className="flex-1 text-left">
                    {key}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({columnType})
                    </span>
                  </span>
                  {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                  {isSorted === 'desc' && (
                    <ArrowDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => column.toggleSorting(false)}
                  disabled={isSorted === 'asc'}
                >
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Sort Ascending
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => column.toggleSorting(true)}
                  disabled={isSorted === 'desc'}
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Sort Descending
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change Type</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => {
                        updateColumnType({
                          datasourceId,
                          columnName: key,
                          columnType: 'string',
                        });
                      }}
                      disabled={columnType === 'string'}
                    >
                      String
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        updateColumnType({
                          datasourceId,
                          columnName: key,
                          columnType: 'number',
                        });
                      }}
                      disabled={columnType === 'number'}
                    >
                      Number
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        updateColumnType({
                          datasourceId,
                          columnName: key,
                          columnType: 'date',
                        });
                      }}
                      disabled={columnType === 'date'}
                    >
                      Date
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        cell: ({ row }) => {
          const value = row.getValue(key);
          const isValid = isValidType(value, columnType);
          return (
            <div
              className={`px-2 ${!isValid ? 'bg-destructive/10 text-destructive' : ''}`}
              title={!isValid ? `Invalid ${columnType} value` : ''}
            >
              {String(value || '')}
            </div>
          );
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

  useEffect(() => {
    if (onTableReady) {
      onTableReady(table);
    }
  }, [onTableReady, table]);

  if (!datasource) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-5 w-24" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array.from({ length: 5 }).map((_col, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <Skeleton className="h-5 w-48" />
          <div className="space-x-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
    );
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
      {table.getVisibleFlatColumns().length > 0 && (
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
      )}
    </div>
  );
}
