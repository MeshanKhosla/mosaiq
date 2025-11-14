import { BarChart3, LineChart, PieChart, Table, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Checkbox } from '~/components/ui/checkbox';

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

export function VisualToolbar({
  onCreateVisual,
  columns,
  selectedVisual,
  sheetId,
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

        {selectedVisual && selectedVisual.type !== 'table' && (
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

        <div className="text-xs px-1 text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">Filters</span>
        </div>
      </div>
    </div>
  );
}
