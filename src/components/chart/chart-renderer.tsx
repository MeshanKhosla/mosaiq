import { useMemo } from 'react';
import { useDuckDbQuery } from 'duckdb-wasm-kit';
import { toast } from 'sonner';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { ColorPalette } from '~/lib/types';
import { Chart } from '~/components/chart';
import BarChart from '~/charts/bar-chart';
import { arrowTo2Series } from '~/lib/utils';
import { useTheme } from '~/components/theme-provider';

type Visual = Doc<'visuals'>;
type Column = Doc<'datasources'>['columns'][number];

const barChart = new BarChart();

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
  } = props;

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

  const query = useMemo(() => {
    if (visual.axes && tableLoaded && tableName) {
      try {
        return barChart.getDuckDbQuery(visual.axes, columns, tableName);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error('Chart config error', { description: msg });
        return '';
      }
    }
    return '';
  }, [visual.axes, tableLoaded, tableName, columns]);

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
        Loading duckdb binary...
      </div>
    );
  if (!tableLoaded)
    return (
      <div className="text-sm text-muted-foreground">Loading chart data...</div>
    );
  if (queryLoading)
    return (
      <div className="text-sm text-muted-foreground">Executing query...</div>
    );
  // Check if axes are configured
  const requirements =
    visual.type !== 'table' ? barChart.getRequirements() : null;
  const hasRequiredAxes = requirements
    ? (visual.axes?.dimensions?.length ?? 0) >=
        requirements.wells.dimensions.min &&
      (visual.axes?.measures?.length ?? 0) >= requirements.wells.measures.min
    : true;

  if (!hasRequiredAxes && requirements) {
    const dimText =
      requirements.wells.dimensions.min === requirements.wells.dimensions.max
        ? `${requirements.wells.dimensions.min} dimension${requirements.wells.dimensions.min !== 1 ? 's' : ''}`
        : `${requirements.wells.dimensions.min}-${requirements.wells.dimensions.max} dimensions`;
    const measText =
      requirements.wells.measures.min === requirements.wells.measures.max
        ? `${requirements.wells.measures.min} measure${requirements.wells.measures.min !== 1 ? 's' : ''}`
        : `${requirements.wells.measures.min}-${requirements.wells.measures.max} measures`;

    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-medium">
            Required: {dimText} and {measText}
          </p>
          <p className="mt-1 text-xs">Configure axes in the toolbar above</p>
        </div>
      </div>
    );
  }

  if (!arrow || !visual.axes)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    );

  try {
    const { labels, values } = arrowTo2Series(arrow);

    const measureId = visual.axes.measures?.[0];
    const measureColumn = columns.find((c) => c._id === measureId);
    const measureName = measureColumn?.name ?? 'Value';
    const dimensionId = visual.axes.dimensions?.[0];
    const dimensionColumn = columns.find((c) => c._id === dimensionId);
    const dimensionName = dimensionColumn?.name ?? 'Category';

    const options = barChart.getOptions(
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
