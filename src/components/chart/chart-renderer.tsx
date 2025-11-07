import { useEffect } from 'react';
import { useDuckDbQuery } from 'duckdb-wasm-kit';
import { toast } from 'sonner';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Chart } from '~/components/chart';
import BarChart from '~/charts/bar-chart';

type Visual = Doc<'visuals'>;
type Column = Doc<'datasources'>['columns'][number];

interface ChartRendererProps {
  visual: Visual;
  datasourceId: Id<'datasources'>;
  columns: Array<Column>;
  csvDataLoading: boolean;
  dbLoading: boolean;
  tableName: string | undefined;
  tableLoaded: boolean;
}

const barChart = new BarChart();

export function ChartRenderer({
  visual,
  datasourceId,
  columns,
  csvDataLoading,
  dbLoading,
  tableName,
  tableLoaded,
}: ChartRendererProps) {
  // Generate query from visual axes
  const query =
    visual.axes && tableLoaded && tableName
      ? barChart.getDuckDbQuery(visual.axes, columns, tableName)
      : '';

  // Execute query
  const {
    arrow,
    loading: queryLoading,
    error: queryError,
  } = useDuckDbQuery(query || '');

  // Handle query errors with useEffect to avoid rendering issues
  useEffect(() => {
    if (queryError) {
      const errorMessage =
        queryError instanceof Error
          ? queryError.message
          : 'Failed to execute query';
      console.error('Query error:', queryError);
      toast.error('Failed to execute query', {
        description: errorMessage,
      });
    }
  }, [queryError]);

  if (csvDataLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading datasource...</div>
    );
  }

  if (dbLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading duckdb binary...
      </div>
    );
  }

  if (!tableLoaded) {
    return (
      <div className="text-sm text-muted-foreground">Loading chart data...</div>
    );
  }

  if (queryLoading) {
    return (
      <div className="text-sm text-muted-foreground">Executing query...</div>
    );
  }

  if (!arrow || !visual.axes) {
    return (
      <div className="text-sm text-muted-foreground">No data available</div>
    );
  }

  // Parse Arrow data to extract labels and values
  try {
    const table = arrow;
    const numRows = table.numRows;
    const labels: Array<string> = [];
    const values: Array<number> = [];

    // Iterate through rows - first column is dimension, second is value
    for (let i = 0; i < numRows; i++) {
      const row = table.get(i);
      if (row) {
        const rowArray = row.toArray();
        // First column is dimension, second is value
        if (rowArray.length >= 2) {
          labels.push(String(rowArray[0] || ''));
          values.push(Number(rowArray[1]) || 0);
        }
      }
    }

    // Get measure column name for display
    const measureColumn = columns.find(
      (col) => col._id === visual.axes?.measures?.[0],
    );
    const measureName = measureColumn?.name || 'Value';

    return (
      <Chart
        datasourceId={datasourceId}
        chartData={{
          labels,
          values,
          measureName,
        }}
      />
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error parsing chart data:', err);
    toast.error('Failed to parse chart data', {
      description: errorMessage,
    });
    return (
      <div className="text-sm text-destructive">
        Error parsing chart data: {errorMessage}
      </div>
    );
  }
}
