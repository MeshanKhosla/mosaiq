import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
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
import { parseCsvToData } from '~/lib/file-utils';

interface DataTableProps {
  datasourceId: Id<'datasources'>;
  searchValue?: string;
}

export function DataTable({ datasourceId, searchValue = '' }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const datasource = useQuery(api.datasources.get, { id: datasourceId });
  const storageUrl = useQuery(api.datasources.getStorageUrl, {
    datasourceId,
  });
  const { data: csvData } = useTanstackQuery({
    queryKey: ['csvData', datasourceId],
    enabled: !!storageUrl,
    queryFn: () =>
      fetch(storageUrl!)
        .then((res) => res.text())
        .then(parseCsvToData),
  });
  const updateColumnType = useMutation(api.datasources.updateColumnType);
  const datasourceColumns = datasource?.columns ?? [];

  // Create a map from column name to column for quick lookup
  const columnMap = useMemo(() => {
    const map = new Map<
      string,
      { _id: string; name: string; type: ColumnType }
    >();
    for (const col of datasourceColumns) {
      map.set(col.name, col);
    }
    return map;
  }, [datasourceColumns]);

  const columns = useMemo<
    Array<ColumnDef<Record<string, string | number>>>
  >(() => {
    if (!csvData || csvData.length === 0) {
      return [];
    }

    const keys = Object.keys(csvData[0]);
    return keys.map((key) => {
      const columnDef = columnMap.get(key);
      const columnType = columnDef?.type ?? 'string';
      const columnId = columnDef?._id ?? '';
      return {
        id: key,
        accessorKey: key,
        enableHiding: true,
        header: ({ column }) => (
          <ColumnHeader
            column={column}
            columnName={key}
            columnId={columnId}
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
  }, [csvData, columnMap, datasourceId, updateColumnType]);

  const table = useReactTable({
    data: csvData ?? [],
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

  if (!datasource || csvData === undefined) {
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
