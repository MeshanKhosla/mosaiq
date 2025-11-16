import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { Doc } from '../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Checkbox } from '~/components/ui/checkbox';
import { getChartInstance } from '~/lib/chart-utils';

type Column = Doc<'datasources'>['columns'][number];

interface FieldWellsProps {
  selectedVisual: Doc<'visuals'>;
  columns: Array<Column>;
  dimensionColumns: Array<Column>;
  measureColumns: Array<Column>;
  onToggleDimension: (columnId: string, checked: boolean) => void;
  onToggleMeasure: (columnId: string, checked: boolean) => void;
  onRemoveDimension: (columnId: string) => void;
  onRemoveMeasure: (columnId: string) => void;
  onUpdateMeasureAggregation: (columnId: string, aggregation: string) => void;
}

const AGGREGATION_OPTIONS = [
  { value: 'SUM', label: 'Sum', numericOnly: true },
  { value: 'AVG', label: 'Average', numericOnly: true },
  { value: 'COUNT', label: 'Count', numericOnly: false },
  { value: 'MIN', label: 'Min', numericOnly: true },
  { value: 'MAX', label: 'Max', numericOnly: true },
  { value: 'COUNT_DISTINCT', label: 'Count Distinct', numericOnly: false },
  { value: 'MEDIAN', label: 'Median', numericOnly: true },
] as const;

function getAvailableAggregations(columnType: Column['type']) {
  if (columnType === 'number') {
    return AGGREGATION_OPTIONS;
  }
  return AGGREGATION_OPTIONS.filter((opt) => !opt.numericOnly);
}

function getMeasureColumnId(
  m: string | { columnId: string; aggregation: string },
): string {
  return typeof m === 'string' ? m : m.columnId;
}

function getMeasureAggregation(
  m: string | { columnId: string; aggregation: string },
): string {
  return typeof m === 'string' ? 'SUM' : m.aggregation;
}

export function FieldWells({
  selectedVisual,
  columns,
  dimensionColumns,
  measureColumns,
  onToggleDimension,
  onToggleMeasure,
  onRemoveDimension,
  onRemoveMeasure,
  onUpdateMeasureAggregation,
}: FieldWellsProps) {
  const currentDimensions = selectedVisual.axes?.dimensions || [];
  const currentMeasures = selectedVisual.axes?.measures || [];

  const chartInstance = useMemo(
    () => getChartInstance(selectedVisual.type),
    [selectedVisual.type],
  );
  const requirements = useMemo(
    () => chartInstance?.getRequirements(),
    [chartInstance],
  );

  const isMeasureSelected = (columnId: string): boolean => {
    return currentMeasures.some((m) => getMeasureColumnId(m) === columnId);
  };

  const dimensionLimitReached =
    requirements &&
    currentDimensions.length >= requirements.wells.dimensions.max;
  const measureLimitReached =
    requirements && currentMeasures.length >= requirements.wells.measures.max;

  return (
    <div className="flex-1 border-l border-border/30 pl-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Field Wells
        </span>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs min-w-[120px]">
            <span className="text-muted-foreground shrink-0">Dimensions</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 border-dashed text-xs p-0"
                >
                  +
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="max-h-60 w-56 overflow-auto p-2"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="space-y-1">
                  {dimensionColumns.map((col) => {
                    const isSelected = currentDimensions.includes(col._id);
                    const isDisabled = !isSelected && dimensionLimitReached;
                    return (
                      <label
                        key={col._id}
                        htmlFor={`dim-${col._id}`}
                        className={`flex items-center space-x-2 rounded-sm px-2 py-1.5 ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-accent cursor-pointer'
                        }`}
                      >
                        <Checkbox
                          id={`dim-${col._id}`}
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={(checked) =>
                            onToggleDimension(col._id, checked === true)
                          }
                        />
                        <span className="text-sm font-normal flex-1">
                          {col.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1">
              {currentDimensions.map((dimId) => {
                const col = columns.find((c) => c._id === dimId);
                return col ? (
                  <span
                    key={dimId}
                    className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs shrink-0"
                  >
                    {col.name}
                    <button
                      onClick={() => onRemoveDimension(dimId)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs min-w-[120px]">
            <span className="text-muted-foreground shrink-0">Measures</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 border-dashed text-xs p-0"
                >
                  +
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="max-h-60 w-56 overflow-auto p-2"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="space-y-1">
                  {measureColumns.map((col) => {
                    const isSelected = isMeasureSelected(col._id);
                    const isDisabled = !isSelected && measureLimitReached;
                    return (
                      <label
                        key={col._id}
                        htmlFor={`meas-${col._id}`}
                        className={`flex items-center space-x-2 rounded-sm px-2 py-1.5 ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-accent cursor-pointer'
                        }`}
                      >
                        <Checkbox
                          id={`meas-${col._id}`}
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={(checked) =>
                            onToggleMeasure(col._id, checked === true)
                          }
                        />
                        <span className="text-sm font-normal flex-1">
                          {col.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1">
              {currentMeasures.map((measure) => {
                const columnId = getMeasureColumnId(measure);
                const aggregation = getMeasureAggregation(measure);
                const col = columns.find((c) => c._id === columnId);
                if (!col) return null;

                const availableAggregations = getAvailableAggregations(
                  col.type,
                );
                const currentAggregationValid = availableAggregations.some(
                  (opt) => opt.value === aggregation,
                );

                const effectiveAggregation = currentAggregationValid
                  ? aggregation
                  : availableAggregations[0].value;

                const aggregationLabel =
                  availableAggregations.find(
                    (opt) => opt.value === effectiveAggregation,
                  )?.label || effectiveAggregation;

                return (
                  <Popover key={columnId}>
                    <PopoverTrigger asChild>
                      <button
                        className="group flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs shrink-0 hover:bg-primary/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>
                          {col.name} ({aggregationLabel})
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveMeasure(columnId);
                          }}
                          className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-48 p-2"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-medium mb-2 px-1">
                          Change aggregation
                        </div>
                        {availableAggregations.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              onUpdateMeasureAggregation(columnId, opt.value);
                            }}
                            className={`w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                              effectiveAggregation === opt.value
                                ? 'bg-accent font-medium'
                                : ''
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
