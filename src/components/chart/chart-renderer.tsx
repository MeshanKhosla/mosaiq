import { useEffect, useState } from 'react';
import { insertFile, useDuckDb, useDuckDbQuery } from 'duckdb-wasm-kit';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Chart } from '~/components/chart';
import BarChart from '~/charts/bar-chart';

type Visual = Doc<'visuals'>;
type Column = Doc<'datasources'>['columns'][number];

interface ChartRendererProps {
  visual: Visual;
  datasourceId: Id<'datasources'>;
  columns: Array<Column>;
  csvData: string | undefined;
  csvDataLoading: boolean;
}

const barChart = new BarChart();

export function ChartRenderer({
  visual,
  datasourceId,
  columns,
  csvData,
  csvDataLoading,
}: ChartRendererProps) {
  const { db, loading: dbLoading, error: dbError } = useDuckDb();
  const tableName = 'data';
  const [tableLoaded, setTableLoaded] = useState(false);

  // Load CSV into DuckDB when DB and CSV data are ready
  useEffect(() => {
    if (!db || !csvData || tableLoaded) return;

    const loadData = async () => {
      try {
        // Create File from CSV string
        const file = new File([csvData], 'data.csv', { type: 'text/csv' });

        // Insert CSV into DuckDB
        await insertFile(db, file, tableName);
        setTableLoaded(true);
      } catch (err) {
        console.error('Failed to load CSV into DuckDB:', err);
      }
    };

    loadData();
  }, [db, csvData, tableName, tableLoaded]);

  // Generate query from visual axes
  const query =
    visual.axes && tableLoaded
      ? barChart.getDuckDbQuery(visual.axes, columns, tableName)
      : '';

  // Execute query
  const {
    arrow,
    loading: queryLoading,
    error: queryError,
  } = useDuckDbQuery(query || '');

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

  if (dbError) {
    return (
      <div className="text-sm text-destructive">
        Error initializing DuckDB: {dbError.message}
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="text-sm text-destructive">
        Error executing query: {queryError.message}
      </div>
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
    return (
      <div className="text-sm text-destructive">
        Error parsing chart data:{' '}
        {err instanceof Error ? err.message : 'Unknown error'}
      </div>
    );
  }
}
