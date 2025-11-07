import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { Axes } from '~/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import BarChart from '~/charts/bar-chart';

type Column = Doc<'datasources'>['columns'][number];

interface CreateChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: Id<'sheets'>;
  columns: Array<Column>;
}

const barChart = new BarChart();

export function CreateChartDialog({
  open,
  onOpenChange,
  sheetId,
  columns,
}: CreateChartDialogProps) {
  const [dimensionId, setDimensionId] = useState<string>('');
  const [measureId, setMeasureId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const createVisual = useMutation(api.visuals.create);

  // Filter columns by type
  const dimensionColumns = columns.filter(
    (col) => col.type === 'string' || col.type === 'date',
  );
  const measureColumns = columns.filter((col) => col.type === 'number');

  const handleCreate = async () => {
    setError('');

    if (!dimensionId || !measureId) {
      setError('Please select both a dimension and a measure');
      return;
    }

    const axes: Axes = {
      dimensions: [dimensionId],
      measures: [measureId],
    };

    // Validate axes
    const validation = barChart.validateAxes(axes);
    if (validation !== true) {
      setError(validation);
      return;
    }

    try {
      await createVisual({
        sheetId,
        type: 'bar_chart',
        title: 'Bar Chart',
        position: {
          x: 0,
          y: 0,
          width: 400,
          height: 300,
        },
        axes,
      });

      // Reset form and close dialog
      setDimensionId('');
      setMeasureId('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chart');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Bar Chart</DialogTitle>
          <DialogDescription>
            Select a dimension and a measure to create a bar chart.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dimension">Dimension</Label>
            <Select value={dimensionId} onValueChange={setDimensionId}>
              <SelectTrigger id="dimension">
                <SelectValue placeholder="Select a dimension" />
              </SelectTrigger>
              <SelectContent>
                {dimensionColumns.map((col) => (
                  <SelectItem key={col._id} value={col._id}>
                    {col.name} ({col.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="measure">Measure</Label>
            <Select value={measureId} onValueChange={setMeasureId}>
              <SelectTrigger id="measure">
                <SelectValue placeholder="Select a measure" />
              </SelectTrigger>
              <SelectContent>
                {measureColumns.map((col) => (
                  <SelectItem key={col._id} value={col._id}>
                    {col.name} ({col.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Chart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
