import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useDuckDbQuery } from 'duckdb-wasm-kit';
import { toast } from 'sonner';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { ColorPalette } from '~/lib/types';
import type { VisualType } from './visual-toolbar';
import type BaseChart from '~/charts/base-chart';
import { Button } from '~/components/ui/button';
import { Chart } from '~/components/chart';
import BarChart from '~/charts/bar-chart';
import PieChart from '~/charts/pie-chart';
import LineChart from '~/charts/line-chart';
import TableChart from '~/charts/table-chart';
import { arrowTo2Series, arrowToTableData } from '~/lib/utils';
import { useTheme } from '~/components/theme-provider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { DataTablePagination } from '~/components/data-table/pagination';

type Visual = Doc<'visuals'>;
type Column = Doc<'datasources'>['columns'][number];

function TableVisualRenderer({ arrow }: { arrow: any }) {
  const tableData = useMemo(() => arrowToTableData(arrow), [arrow]);
  const columnNames = useMemo(
    () => arrow?.schema.fields.map((field: any) => field.name) ?? [],
    [arrow],
  );

  const tableColumns = useMemo<Array<ColumnDef<Record<string, any>>>>(() => {
    return columnNames.map((name: string) => ({
      id: name,
      accessorKey: name,
      header: ({ column }: { column: any }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            className="h-8 px-2 w-full justify-start hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              column.toggleSorting();
            }}
          >
            {name}
            {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
            {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
          </Button>
        );
      },
      cell: ({ row }: { row: any }) => {
        const value = row.getValue(name);
        if (value === null || value === undefined) {
          return <span className="text-muted-foreground">-</span>;
        }
        if (typeof value === 'number') {
          return value.toLocaleString();
        }
        return String(value);
      },
    }));
  }, [columnNames]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: {
      sorting,
    },
  });

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  colSpan={tableColumns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t" onClick={(e) => e.stopPropagation()}>
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}

function getChartInstance(type: VisualType): BaseChart | null {
  switch (type) {
    case 'table':
      return new TableChart();
    case 'bar_chart':
      return new BarChart();
    case 'pie_chart':
      return new PieChart();
    case 'line_chart':
      return new LineChart();
    default:
      return new BarChart();
  }
}

export function ChartRenderer(props: {
  visual: Visual;
  datasourceId: Id<'datasources'>;
  columns: Array<Column>;
  csvDataLoading: boolean;
  dbLoading: boolean;
  tableName?: string;
  tableLoaded: boolean;
  width?: number;
  height?: number;
  sheetId: Id<'sheets'>;
}) {
  const {
    visual,
    columns,
    csvDataLoading,
    dbLoading,
    tableName,
    tableLoaded,
    width,
    height,
    sheetId,
  } = props;

  const sheet = useQuery(api.sheets.get, { id: sheetId });
  const filters = sheet?.filters || [];

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = {
    textColor: isDark ? 'hsl(220, 5%, 90%)' : 'hsl(240, 10%, 8%)',
    labelColor: isDark ? 'hsl(220, 5%, 90%)' : 'hsl(240, 10%, 8%)',
    borderColor: isDark ? 'hsl(220, 10%, 16%)' : 'hsl(240, 8%, 88%)',
    tooltipBg: isDark ? 'hsl(220, 12%, 11%)' : 'hsl(34, 10%, 97%)',
    backgroundColor: 'transparent',
    seriesColor: '#3b82f6',
    seriesEmphasisColor: '#2563eb',
  } as ColorPalette;

  const chartInstance = useMemo(() => {
    return getChartInstance(visual.type);
  }, [visual.type]);

  const validationResult = useMemo(() => {
    if (!chartInstance) {
      return 'Chart not constructed';
    }
    return chartInstance.validateAxes(visual.axes);
  }, [chartInstance, visual.axes]);

  const query = useMemo(() => {
    if (
      validationResult === true &&
      visual.axes &&
      tableLoaded &&
      tableName &&
      chartInstance
    ) {
      try {
        return chartInstance.getDuckDbQuery(
          visual.axes,
          columns,
          tableName,
          filters.length > 0 ? filters : undefined,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error('Chart config error', { description: msg });
        return '';
      }
    }
    return '';
  }, [
    validationResult,
    visual.axes,
    tableLoaded,
    tableName,
    columns,
    chartInstance,
    filters,
  ]);

  const {
    arrow,
    loading: queryLoading,
    error: queryError,
  } = useDuckDbQuery(query);

  if (queryError) {
    return (
      <div className="text-sm text-muted-foreground">
        Failed to execute query: {queryError.message}
      </div>
    );
  }
  if (csvDataLoading)
    return (
      <div className="text-sm text-muted-foreground">Loading datasource...</div>
    );
  if (dbLoading)
    return (
      <div className="text-sm text-muted-foreground">
        Loading DuckDB WASM binary...
      </div>
    );
  if (!tableLoaded)
    return (
      <div className="text-sm text-muted-foreground">Loading chart data...</div>
    );

  if (validationResult !== true) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-medium text-red-400">{validationResult}</p>
          <p className="mt-1 text-xs">Configure axes in the toolbar above</p>
        </div>
      </div>
    );
  }

  // Only show loading if axes are valid and query is loading
  // This prevents flash when transitioning from temp to real ID (axes don't change)
  if (queryLoading)
    return (
      <div className="text-sm text-muted-foreground">Executing query...</div>
    );

  if (!arrow || !visual.axes)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    );

  if (!chartInstance) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Invalid chart type</div>
      </div>
    );
  }

  if (visual.type === 'table') {
    try {
      return <TableVisualRenderer arrow={arrow} />;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error parsing table data:', err);
      toast.error('Failed to parse table data', { description: errorMessage });
      return (
        <div className="text-sm text-destructive">
          Error parsing table data: {errorMessage}
        </div>
      );
    }
  }

  try {
    const { labels, values } = arrowTo2Series(arrow);

    const measure = visual.axes.measures?.[0];
    const measureId = typeof measure === 'string' ? measure : measure?.columnId;
    const measureColumn = columns.find((c) => c._id === measureId);
    const measureName = measureColumn?.name ?? 'Value';
    const dimensionId = visual.axes.dimensions?.[0];
    const dimensionColumn = columns.find((c) => c._id === dimensionId);
    const dimensionName = dimensionColumn?.name ?? 'Category';

    const options = chartInstance.getOptions(
      visual.axes,
      labels,
      values,
      measureName,
      dimensionName,
      colors,
      width,
      height,
    );

    return <Chart options={options} width={width} height={height} />;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error parsing chart data:', err);
    toast.error('Failed to parse chart data', { description: errorMessage });
    return (
      <div className="text-sm text-destructive">
        Error parsing chart data: {errorMessage}
      </div>
    );
  }
}
