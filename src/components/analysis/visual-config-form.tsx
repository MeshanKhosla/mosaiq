import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { AggregationType, MeasureConfig, Visual } from '~/lib/types';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

interface VisualConfigFormProps {
  visual: Visual;
  datasourceId: Id<'datasources'>;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function VisualConfigForm({
  visual,
  datasourceId,
}: VisualConfigFormProps) {
  const datasource = useQuery(api.datasources.get, { id: datasourceId });
  const updateVisual = useMutation(api.visuals.update);

  const [dimension, setDimension] = useState(visual.config.dimension ?? '');
  const [measures, setMeasures] = useState<Array<MeasureConfig>>(
    visual.config.measures ?? [],
  );
  const [columns, setColumns] = useState<Array<string>>(
    visual.config.columns ?? [],
  );

  const debouncedDimension = useDebounce(dimension, 300);
  const debouncedMeasures = useDebounce(measures, 300);
  const debouncedColumns = useDebounce(columns, 300);

  // Auto-save when debounced values change
  useEffect(() => {
    if (visual.type === 'table') {
      updateVisual({
        id: visual._id,
        config: { columns: debouncedColumns },
      });
    } else {
      updateVisual({
        id: visual._id,
        config: {
          dimension: debouncedDimension || undefined,
          measures: debouncedMeasures,
        },
      });
    }
  }, [debouncedDimension, debouncedMeasures, debouncedColumns]);

  const availableColumns = datasource?.data?.[0]
    ? Object.keys(datasource.data[0])
    : [];

  const columnTypes = datasource?.columnTypes ?? {};

  const handleAddMeasure = () => {
    const firstColumn = availableColumns[0];
    if (firstColumn) {
      setMeasures([
        ...measures,
        { column: firstColumn, aggregation: 'SUM' as AggregationType },
      ]);
    }
  };

  const handleRemoveMeasure = (index: number) => {
    setMeasures(measures.filter((_, i) => i !== index));
  };

  const handleMeasureColumnChange = (index: number, column: string) => {
    const newMeasures = [...measures];
    newMeasures[index] = { ...newMeasures[index], column };
    setMeasures(newMeasures);
  };

  const handleMeasureAggregationChange = (
    index: number,
    aggregation: AggregationType,
  ) => {
    const newMeasures = [...measures];
    newMeasures[index] = { ...newMeasures[index], aggregation };
    setMeasures(newMeasures);
  };

  const handleToggleColumn = (column: string) => {
    if (columns.includes(column)) {
      setColumns(columns.filter((c) => c !== column));
    } else {
      setColumns([...columns, column]);
    }
  };

  if (!datasource || !datasource.data || datasource.data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No data available in datasource
      </div>
    );
  }

  if (visual.type === 'table') {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Columns to Display
          </label>
          <div className="space-y-1">
            {availableColumns.map((column) => (
              <label
                key={column}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={columns.includes(column)}
                  onChange={() => handleToggleColumn(column)}
                  className="rounded"
                />
                <span>{column}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chart types (bar, line, pie)
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Dimension (X-Axis / Category)
        </label>
        <Select value={dimension} onValueChange={setDimension}>
          <SelectTrigger>
            <SelectValue placeholder="Select dimension" />
          </SelectTrigger>
          <SelectContent>
            {availableColumns.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">
            Measures (Y-Axis / Values)
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={handleAddMeasure}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {measures.map((measure, index) => (
            <div key={index} className="flex gap-2">
              <Select
                value={measure.column}
                onValueChange={(value) =>
                  handleMeasureColumnChange(index, value)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns
                    .filter((col) => columnTypes[col] === 'number')
                    .map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select
                value={measure.aggregation}
                onValueChange={(value) =>
                  handleMeasureAggregationChange(
                    index,
                    value as AggregationType,
                  )
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUM">SUM</SelectItem>
                  <SelectItem value="AVG">AVG</SelectItem>
                  <SelectItem value="COUNT">COUNT</SelectItem>
                  <SelectItem value="MIN">MIN</SelectItem>
                  <SelectItem value="MAX">MAX</SelectItem>
                  <SelectItem value="NONE">NONE</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => handleRemoveMeasure(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {measures.length === 0 && (
            <div className="text-xs text-muted-foreground py-2">
              No measures added yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
