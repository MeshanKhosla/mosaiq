import {
  BarChart3,
  Filter,
  LineChart,
  PieChart,
  Plus,
  Table,
  X,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { useDuckDbQuery } from 'duckdb-wasm-kit';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
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
  { type: 'line_chart', label: 'Line Chart', icon: LineChart },
  { type: 'pie_chart', label: 'Pie Chart', icon: PieChart },
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
}: FieldWellsProps) {
  const currentDimensions = selectedVisual.axes?.dimensions || [];
  const currentMeasures = selectedVisual.axes?.measures || [];

  return (
    <div className="flex-1 border-r border-border pr-3">
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
                    return (
                      <label
                        key={col._id}
                        htmlFor={`dim-${col._id}`}
                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          id={`dim-${col._id}`}
                          checked={isSelected}
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
                    const isSelected = currentMeasures.includes(col._id);
                    return (
                      <label
                        key={col._id}
                        htmlFor={`meas-${col._id}`}
                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          id={`meas-${col._id}`}
                          checked={isSelected}
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
              {currentMeasures.map((measId) => {
                const col = columns.find((c) => c._id === measId);
                return col ? (
                  <span
                    key={measId}
                    className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs shrink-0"
                  >
                    {col.name}
                    <button
                      onClick={() => onRemoveMeasure(measId)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null;
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

    const newSelectedValues = checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value);

    const otherFilters = filters.filter((f) => f.columnId !== selectedColumnId);
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
                        const isSelected = selectedValues.includes(value);
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
  const measureColumns = columns.filter((col) => col.type === 'number');

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
    const newMeasures = checked
      ? [...currentMeasures, columnId]
      : currentMeasures.filter((id) => id !== columnId);

    if (checked && currentMeasures.includes(columnId)) return;

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
    <div className="border-b border-border bg-background/50 backdrop-blur-sm -mx-6">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="flex items-center gap-1 border-r border-border pr-3">
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
    </div>
  );
}
