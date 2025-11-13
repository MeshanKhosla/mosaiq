import { useState } from 'react';
import { BarChart3, LineChart, PieChart, Table, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { ChartRequirements } from '~/charts/base-chart';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import BarChart from '~/charts/bar-chart';

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

// Helper to get chart instance and requirements
function getChartRequirements(chartType: VisualType): ChartRequirements | null {
  if (chartType === 'table') return null;

  if (chartType === 'bar_chart') {
    const chart = new BarChart();
    return chart.getRequirements();
  }

  // For other chart types, return default requirements for now
  // TODO: Add other chart types (line_chart, pie_chart)
  return {
    wells: {
      dimensions: { min: 1, max: 1 },
      measures: { min: 1, max: 1 },
    },
  };
}

export function VisualToolbar({
  onCreateVisual,
  columns,
  selectedVisual,
}: VisualToolbarProps) {
  const [creatingChartType, setCreatingChartType] = useState<VisualType | null>(
    null,
  );
  const [tempDimension, setTempDimension] = useState<string>('');
  const [tempMeasure, setTempMeasure] = useState<string>('');
  const updateAxes = useMutation(api.visuals.updateAxes);

  const dimensionColumns = columns.filter(
    (col) => col.type === 'string' || col.type === 'date',
  );
  const measureColumns = columns.filter((col) => col.type === 'number');

  const handleCreateVisual = (type: VisualType) => {
    if (type === 'table') {
      onCreateVisual(type);
      return;
    }

    // For charts, show quick config
    setCreatingChartType(type);
  };

  const handleConfirmChart = () => {
    if (!creatingChartType || !tempDimension || !tempMeasure) return;

    onCreateVisual(creatingChartType, {
      dimensions: [tempDimension],
      measures: [tempMeasure],
    });

    setCreatingChartType(null);
    setTempDimension('');
    setTempMeasure('');
  };

  const handleCancelChart = () => {
    setCreatingChartType(null);
    setTempDimension('');
    setTempMeasure('');
  };

  const handleToggleDimension = (columnId: string, checked: boolean) => {
    if (!selectedVisual) return;

    const currentDimensions = selectedVisual.axes?.dimensions || [];
    const requirements = getChartRequirements(selectedVisual.type);

    if (checked) {
      // Check if we've reached max
      if (
        requirements &&
        currentDimensions.length >= requirements.wells.dimensions.max
      ) {
        return;
      }
      if (currentDimensions.includes(columnId)) return;

      updateAxes({
        id: selectedVisual._id,
        axes: {
          dimensions: [...currentDimensions, columnId],
          measures: selectedVisual.axes?.measures || [],
        },
      });
    } else {
      // Check if we're at min
      if (
        requirements &&
        currentDimensions.length <= requirements.wells.dimensions.min
      ) {
        return;
      }

      updateAxes({
        id: selectedVisual._id,
        axes: {
          dimensions: currentDimensions.filter((id) => id !== columnId),
          measures: selectedVisual.axes?.measures || [],
        },
      });
    }
  };

  const handleToggleMeasure = (columnId: string, checked: boolean) => {
    if (!selectedVisual) return;

    const currentMeasures = selectedVisual.axes?.measures || [];
    const requirements = getChartRequirements(selectedVisual.type);

    if (checked) {
      // Check if we've reached max
      if (
        requirements &&
        currentMeasures.length >= requirements.wells.measures.max
      ) {
        return;
      }
      if (currentMeasures.includes(columnId)) return;

      updateAxes({
        id: selectedVisual._id,
        axes: {
          dimensions: selectedVisual.axes?.dimensions || [],
          measures: [...currentMeasures, columnId],
        },
      });
    } else {
      // Check if we're at min
      if (
        requirements &&
        currentMeasures.length <= requirements.wells.measures.min
      ) {
        return;
      }

      updateAxes({
        id: selectedVisual._id,
        axes: {
          dimensions: selectedVisual.axes?.dimensions || [],
          measures: currentMeasures.filter((id) => id !== columnId),
        },
      });
    }
  };

  const handleRemoveDimension = (columnId: string) => {
    handleToggleDimension(columnId, false);
  };

  const handleRemoveMeasure = (columnId: string) => {
    handleToggleMeasure(columnId, false);
  };

  return (
    <div className="border-b border-border bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 p-3">
        {/* Visual Type Buttons */}
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

        {/* Quick Chart Config */}
        {creatingChartType && (
          <div className="flex items-center gap-2 border-r border-border pr-3">
            <span className="text-xs text-muted-foreground">
              {creatingChartType
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')}
              :
            </span>
            <Select value={tempDimension} onValueChange={setTempDimension}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Dimension" />
              </SelectTrigger>
              <SelectContent>
                {dimensionColumns.map((col) => (
                  <SelectItem key={col._id} value={col._id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tempMeasure} onValueChange={setTempMeasure}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Measure" />
              </SelectTrigger>
              <SelectContent>
                {measureColumns.map((col) => (
                  <SelectItem key={col._id} value={col._id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleConfirmChart}
              disabled={!tempDimension || !tempMeasure}
            >
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelChart}>
              Cancel
            </Button>
          </div>
        )}

        {/* Field Wells Section */}
        {selectedVisual &&
          selectedVisual.type !== 'table' &&
          (() => {
            const requirements = getChartRequirements(selectedVisual.type);
            const currentDimensions = selectedVisual.axes?.dimensions || [];
            const currentMeasures = selectedVisual.axes?.measures || [];
            const dimMaxReached = requirements
              ? currentDimensions.length >= requirements.wells.dimensions.max
              : false;
            const measMaxReached = requirements
              ? currentMeasures.length >= requirements.wells.measures.max
              : false;
            const dimMinReached = requirements
              ? currentDimensions.length <= requirements.wells.dimensions.min
              : false;
            const measMinReached = requirements
              ? currentMeasures.length <= requirements.wells.measures.min
              : false;

            return (
              <div className="flex-1 border-r border-border pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Field Wells
                  </span>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs min-w-[120px]">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentDimensions.map((dimId) => {
                          const col = columns.find((c) => c._id === dimId);
                          return col ? (
                            <span
                              key={dimId}
                              className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs"
                            >
                              {col.name}
                              <button
                                onClick={() => handleRemoveDimension(dimId)}
                                disabled={dimMinReached}
                                className={`hover:text-destructive ${dimMinReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 border-dashed text-xs"
                              disabled={dimMaxReached}
                            >
                              + {dimMaxReached ? '(max)' : ''}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="max-h-60 w-56 overflow-auto p-2"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <div className="space-y-1">
                              {dimensionColumns.map((col) => {
                                const isSelected = currentDimensions.includes(
                                  col._id,
                                );
                                const isDisabled = !isSelected && dimMaxReached;
                                return (
                                  <div
                                    key={col._id}
                                    className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                                  >
                                    <Checkbox
                                      id={`dim-${col._id}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleToggleDimension(
                                          col._id,
                                          checked === true,
                                        )
                                      }
                                      disabled={isDisabled}
                                      className={isDisabled ? 'opacity-50' : ''}
                                    />
                                    <Label
                                      htmlFor={`dim-${col._id}`}
                                      className={`text-sm font-normal cursor-pointer flex-1 ${
                                        isDisabled
                                          ? 'opacity-50 cursor-not-allowed'
                                          : ''
                                      }`}
                                    >
                                      {col.name}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs min-w-[120px]">
                      <span className="text-muted-foreground">Measures:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentMeasures.map((measId) => {
                          const col = columns.find((c) => c._id === measId);
                          return col ? (
                            <span
                              key={measId}
                              className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs"
                            >
                              {col.name}
                              <button
                                onClick={() => handleRemoveMeasure(measId)}
                                disabled={measMinReached}
                                className={`hover:text-destructive ${measMinReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 border-dashed text-xs"
                              disabled={measMaxReached}
                            >
                              + {measMaxReached ? '(max)' : ''}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="max-h-60 w-56 overflow-auto p-2"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <div className="space-y-1">
                              {measureColumns.map((col) => {
                                const isSelected = currentMeasures.includes(
                                  col._id,
                                );
                                const isDisabled =
                                  !isSelected && measMaxReached;
                                return (
                                  <div
                                    key={col._id}
                                    className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                                  >
                                    <Checkbox
                                      id={`meas-${col._id}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleToggleMeasure(
                                          col._id,
                                          checked === true,
                                        )
                                      }
                                      disabled={isDisabled}
                                      className={isDisabled ? 'opacity-50' : ''}
                                    />
                                    <Label
                                      htmlFor={`meas-${col._id}`}
                                      className={`text-sm font-normal cursor-pointer flex-1 ${
                                        isDisabled
                                          ? 'opacity-50 cursor-not-allowed'
                                          : ''
                                      }`}
                                    >
                                      {col.name}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Filters Section - for future filter controls */}
        <div className="border-r border-border pr-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wide">Filters</span>
          </div>
        </div>

        {/* Additional Controls */}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">More</span>
        </div>
      </div>
    </div>
  );
}
