import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table,
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FieldWells } from './field-wells';
import { Filters } from './filters';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { VisualType } from '~/lib/chart-utils';
import { Button } from '~/components/ui/button';

type Column = Doc<'datasources'>['columns'][number];

interface VisualToolbarProps {
  onCreateVisual: (
    type: VisualType,
    axes?: { dimensions?: Array<string>; measures?: Array<string> },
  ) => void;
  sheetId: Id<'sheets'>;
  columns: Array<Column>;
  selectedVisual?: Doc<'visuals'> | null;
  onVisualSelect?: (visual: Doc<'visuals'> | null) => void;
  tableName?: string;
  tableLoaded: boolean;
}

const visualTypes: Array<{
  type: VisualType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: 'table', label: 'Table', icon: Table },
  { type: 'bar_chart', label: 'Bar Chart', icon: BarChart3 },
  { type: 'line_chart', label: 'Line Chart', icon: LineChartIcon },
  { type: 'pie_chart', label: 'Pie Chart', icon: PieChartIcon },
];

export function VisualToolbar({
  onCreateVisual,
  columns,
  selectedVisual,
  sheetId,
  tableName,
  tableLoaded,
}: VisualToolbarProps) {
  const updateAxes = useMutation(api.visuals.updateAxes).withOptimisticUpdate(
    (localStore, args) => {
      const existingVisuals = localStore.getQuery(api.visuals.getBySheet, {
        sheetId,
      });

      if (existingVisuals !== undefined && existingVisuals !== null) {
        const updatedVisuals = existingVisuals.map((v) =>
          v._id === args.id
            ? {
                ...v,
                axes: args.axes,
              }
            : v,
        );
        localStore.setQuery(
          api.visuals.getBySheet,
          { sheetId },
          updatedVisuals,
        );
      }
    },
  );

  const dimensionColumns = columns.filter(
    (col) => col.type === 'string' || col.type === 'date',
  );
  const measureColumns = columns;

  const handleCreateVisual = (type: VisualType) => {
    onCreateVisual(type);
  };

  const handleToggleDimension = (columnId: string, checked: boolean) => {
    if (!selectedVisual) return;

    const currentDimensions = selectedVisual.axes?.dimensions || [];
    const newDimensions = checked
      ? [...currentDimensions, columnId]
      : currentDimensions.filter((id) => id !== columnId);

    if (checked && currentDimensions.includes(columnId)) return;

    const newAxes = {
      dimensions: newDimensions,
      measures: selectedVisual.axes?.measures || [],
    };

    updateAxes({
      id: selectedVisual._id,
      axes: newAxes,
    });
  };

  const handleToggleMeasure = (columnId: string, checked: boolean) => {
    if (!selectedVisual) return;

    const currentMeasures = selectedVisual.axes?.measures || [];
    const getMeasureColumnId = (
      m: string | { columnId: string; aggregation: string },
    ): string => {
      return typeof m === 'string' ? m : m.columnId;
    };

    const isMeasureIncluded = currentMeasures.some(
      (m) => getMeasureColumnId(m) === columnId,
    );

    if (checked && isMeasureIncluded) return;

    // Non-numeric fields default to COUNT aggregation
    const column = columns.find((c) => c._id === columnId);
    const defaultAggregation = column?.type === 'number' ? 'SUM' : 'COUNT';

    const newMeasures = checked
      ? [...currentMeasures, { columnId, aggregation: defaultAggregation }]
      : currentMeasures.filter((m) => getMeasureColumnId(m) !== columnId);

    const newAxes = {
      dimensions: selectedVisual.axes?.dimensions || [],
      measures: newMeasures,
    };

    updateAxes({
      id: selectedVisual._id,
      axes: newAxes,
    });
  };

  const handleUpdateMeasureAggregation = (
    columnId: string,
    aggregation: string,
  ) => {
    if (!selectedVisual) return;

    const currentMeasures = selectedVisual.axes?.measures || [];
    const getMeasureColumnId = (
      m: string | { columnId: string; aggregation: string },
    ): string => {
      return typeof m === 'string' ? m : m.columnId;
    };

    const newMeasures = currentMeasures.map((m) => {
      if (getMeasureColumnId(m) === columnId) {
        return { columnId, aggregation };
      }
      return typeof m === 'string' ? { columnId: m, aggregation: 'SUM' } : m;
    });

    const newAxes = {
      dimensions: selectedVisual.axes?.dimensions || [],
      measures: newMeasures,
    };

    updateAxes({
      id: selectedVisual._id,
      axes: newAxes,
    });
  };

  const handleRemoveDimension = (columnId: string) => {
    handleToggleDimension(columnId, false);
  };

  const handleRemoveMeasure = (columnId: string) => {
    handleToggleMeasure(columnId, false);
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex items-center gap-1 border-l border-border/30 pl-3">
        {visualTypes.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => handleCreateVisual(type)}
            className="h-9 w-9 p-0"
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {selectedVisual && (
        <FieldWells
          selectedVisual={selectedVisual}
          columns={columns}
          dimensionColumns={dimensionColumns}
          measureColumns={measureColumns}
          onToggleDimension={handleToggleDimension}
          onToggleMeasure={handleToggleMeasure}
          onRemoveDimension={handleRemoveDimension}
          onRemoveMeasure={handleRemoveMeasure}
          onUpdateMeasureAggregation={handleUpdateMeasureAggregation}
        />
      )}

      <div className="ml-auto">
        <Filters
          sheetId={sheetId}
          columns={columns}
          tableName={tableName}
          tableLoaded={tableLoaded}
        />
      </div>
    </div>
  );
}
