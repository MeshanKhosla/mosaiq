import {
  BarChart3,
  Filter,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Plus,
  Table,
  X,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { useDuckDbQuery } from 'duckdb-wasm-kit';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type BaseChart from '~/charts/base-chart';
import BarChart from '~/charts/bar-chart';
import PieChart from '~/charts/pie-chart';
import LineChart from '~/charts/line-chart';
import TableChart from '~/charts/table-chart';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Input } from '~/components/ui/input';

export type VisualType = 'table' | 'bar_chart' | 'line_chart' | 'pie_chart';

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

const AGGREGATION_OPTIONS = [
  { value: 'SUM', label: 'Sum', numericOnly: true },
  { value: 'AVG', label: 'Average', numericOnly: true },
  { value: 'COUNT', label: 'Count', numericOnly: false },
  { value: 'MIN', label: 'Min', numericOnly: true },
  { value: 'MAX', label: 'Max', numericOnly: true },
  { value: 'COUNT_DISTINCT', label: 'Count Distinct', numericOnly: false },
  { value: 'MEDIAN', label: 'Median', numericOnly: true },
] as const;

/**
 * Get available aggregations for a column type.
 * All fields can be used as measures, but non-numeric fields can only use COUNT/COUNT_DISTINCT.
 * Numeric fields can use all aggregation types.
 */
function getAvailableAggregations(columnType: 'string' | 'number' | 'date') {
  if (columnType === 'number') {
    return AGGREGATION_OPTIONS;
  }
  // Non-numeric fields (string/date) can only use COUNT and COUNT_DISTINCT
  return AGGREGATION_OPTIONS.filter((opt) => !opt.numericOnly);
}

function FieldWells({
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

  const getMeasureColumnId = (
    m: string | { columnId: string; aggregation: string },
  ): string => {
    return typeof m === 'string' ? m : m.columnId;
  };

  const getMeasureAggregation = (
    m: string | { columnId: string; aggregation: string },
  ): string => {
    return typeof m === 'string' ? 'SUM' : m.aggregation;
  };

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

                // Auto-correct invalid aggregation on render
                if (!currentAggregationValid) {
                  // Use setTimeout to avoid state updates during render
                  setTimeout(() => {
                    onUpdateMeasureAggregation(columnId, effectiveAggregation);
                  }, 0);
                }

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

interface FiltersProps {
  sheetId: Id<'sheets'>;
  columns: Array<Column>;
  tableName?: string;
  tableLoaded: boolean;
}

function Filters({ sheetId, columns, tableName, tableLoaded }: FiltersProps) {
  const sheet = useQuery(api.sheets.get, { id: sheetId });
  const updateFilters = useMutation(
    api.sheets.updateFilters,
  ).withOptimisticUpdate((localStore, args) => {
    const existingSheet = localStore.getQuery(api.sheets.get, {
      id: args.sheetId,
    });

    if (existingSheet !== undefined && existingSheet !== null) {
      localStore.setQuery(
        api.sheets.get,
        { id: args.sheetId },
        {
          ...existingSheet,
          filters: args.filters.length > 0 ? args.filters : undefined,
        },
      );
    }
  });

  const filters = sheet?.filters || [];
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedColumn = columns.find((col) => col._id === selectedColumnId);

  const escapeColumnName = (name: string): string => {
    if (
      /[^a-zA-Z0-9_]/.test(name) ||
      /^\d/.test(name) ||
      ['select', 'from', 'where', 'group', 'order', 'by', 'as'].includes(
        name.toLowerCase(),
      )
    ) {
      return `"${name.replace(/"/g, '""')}"`;
    }
    return name;
  };

  const distinctValuesQuery = useMemo(() => {
    if (!selectedColumn || !tableName || !tableLoaded) {
      return '';
    }
    const columnName = escapeColumnName(selectedColumn.name);
    const escapedTableName = escapeColumnName(tableName);
    return `SELECT DISTINCT ${columnName} as value FROM ${escapedTableName} ORDER BY ${columnName}`;
  }, [selectedColumn, tableName, tableLoaded]);

  const { arrow: distinctValuesArrow, loading: distinctValuesLoading } =
    useDuckDbQuery(distinctValuesQuery);

  const distinctValues = useMemo(() => {
    if (!distinctValuesArrow) {
      return [];
    }
    const values: Array<string | number> = [];
    try {
      const data = distinctValuesArrow.toArray();
      for (const row of data) {
        const value = row.value;
        if (value !== null && value !== undefined) {
          values.push(value);
        }
      }
    } catch (e) {
      console.error('Error parsing distinct values:', e);
    }
    return values;
  }, [distinctValuesArrow]);

  const filteredValues = useMemo(() => {
    if (!searchValue.trim()) {
      return distinctValues;
    }
    const searchLower = searchValue.toLowerCase();
    return distinctValues.filter((val) =>
      String(val).toLowerCase().includes(searchLower),
    );
  }, [distinctValues, searchValue]);

  const currentFilter = filters.find((f) => f.columnId === selectedColumnId);
  const selectedValues = currentFilter?.selectedValues || [];

  const handleToggleValue = (value: string | number, checked: boolean) => {
    if (!selectedColumnId) return;

    const otherFilters = filters.filter((f) => f.columnId !== selectedColumnId);

    // If there's no filter, all values are implicitly selected
    if (!currentFilter) {
      if (checked) {
        // All values are already selected, no need to create a filter
        return;
      } else {
        // Unchecking a value: create filter with all values except this one
        const newSelectedValues = distinctValues.filter((v) => v !== value);
        if (newSelectedValues.length > 0) {
          const newFilters = [
            ...otherFilters,
            { columnId: selectedColumnId, selectedValues: newSelectedValues },
          ];
          updateFilters({ sheetId, filters: newFilters });
        }
        return;
      }
    }

    // Filter exists: normal toggle logic
    const newSelectedValues = checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value);

    const newFilters =
      newSelectedValues.length > 0
        ? [
            ...otherFilters,
            { columnId: selectedColumnId, selectedValues: newSelectedValues },
          ]
        : otherFilters;

    updateFilters({ sheetId, filters: newFilters });
  };

  const handleRemoveFilter = (columnId: string) => {
    const newFilters = filters.filter((f) => f.columnId !== columnId);
    updateFilters({ sheetId, filters: newFilters });
  };

  const handleAddFilter = () => {
    setIsPopoverOpen(true);
  };

  const handleColumnSelect = (columnId: string) => {
    setSelectedColumnId(columnId);
    setSearchValue('');
    const existingFilter = filters.find((f) => f.columnId === columnId);
    if (existingFilter) {
      // Filter already exists, values will be loaded from currentFilter
    }
  };

  const handlePopoverClose = (open: boolean) => {
    setIsPopoverOpen(open);
    if (!open) {
      setSelectedColumnId('');
      setSearchValue('');
    }
  };

  const availableColumns = columns;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {filters.map((filter) => {
          const column = columns.find((col) => col._id === filter.columnId);
          if (!column) return null;
          return (
            <span
              key={filter.columnId}
              className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs shrink-0 cursor-pointer hover:bg-primary/20"
              onClick={() => {
                setSelectedColumnId(filter.columnId);
                setIsPopoverOpen(true);
              }}
            >
              <Filter className="h-3 w-3" />
              {column.name}
              {filter.selectedValues.length > 0 && (
                <span className="text-muted-foreground">
                  ({filter.selectedValues.length})
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFilter(filter.columnId);
                }}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <Popover open={isPopoverOpen} onOpenChange={handlePopoverClose}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 border border-dashed text-xs px-2"
              onClick={handleAddFilter}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="w-80 p-3"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Select Column
                </label>
                <Select
                  value={selectedColumnId}
                  onValueChange={handleColumnSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => {
                      const hasFilter = filters.some(
                        (f) => f.columnId === col._id,
                      );
                      return (
                        <SelectItem key={col._id} value={col._id}>
                          {col.name}
                          {hasFilter && ' (filtered)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedColumn && (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">
                      Filter Values
                    </label>
                    <Input
                      placeholder="Search values..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  {distinctValuesLoading ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      Loading values...
                    </div>
                  ) : filteredValues.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      {searchValue ? 'No matching values' : 'No values found'}
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-auto space-y-1 border rounded-md p-2">
                      {filteredValues.map((value, index) => {
                        // If there's no filter, all values are implicitly selected
                        const isSelected = currentFilter
                          ? selectedValues.includes(value)
                          : true;
                        return (
                          <label
                            key={`${value}-${index}`}
                            htmlFor={`filter-value-${index}`}
                            className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                          >
                            <Checkbox
                              id={`filter-value-${index}`}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleToggleValue(value, checked === true)
                              }
                            />
                            <span className="text-sm font-normal flex-1">
                              {String(value)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

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

    const column = columns.find((c) => c._id === columnId);
    // Default aggregation: SUM for numeric fields, COUNT for non-numeric fields
    // (all fields can be measures, but non-numeric fields use COUNT)
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

    const column = columns.find((c) => c._id === columnId);
    if (!column) return;

    const availableAggregations = getAvailableAggregations(column.type);
    const isValidAggregation = availableAggregations.some(
      (opt) => opt.value === aggregation,
    );

    if (!isValidAggregation) {
      return;
    }

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
