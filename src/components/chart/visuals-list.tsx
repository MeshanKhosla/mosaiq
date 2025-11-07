import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ChartRenderer } from './chart-renderer';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';

interface VisualsListProps {
  sheetId: Id<'sheets'>;
  datasourceId: Id<'datasources'>;
  csvDataLoading: boolean;
  dbLoading: boolean;
  tableName: string | undefined;
  tableLoaded: boolean;
}

export function VisualsList({
  sheetId,
  datasourceId,
  csvDataLoading,
  dbLoading,
  tableName,
  tableLoaded,
}: VisualsListProps) {
  const sheet = useQuery(api.sheets.get, { id: sheetId });
  const datasource = useQuery(api.datasources.get, { id: datasourceId });
  const visuals = useQuery(api.visuals.getBySheet, { sheetId });
  const deleteVisual = useMutation(api.visuals.deleteVisual);

  if (!sheet || !datasource || visuals === undefined) {
    return (
      <div className="text-sm text-muted-foreground">Loading visuals...</div>
    );
  }

  if (visuals.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No visuals yet. Create a chart to get started.
      </div>
    );
  }

  const handleDelete = async (visualId: Id<'visuals'>) => {
    if (confirm('Are you sure you want to delete this visual?')) {
      try {
        await deleteVisual({ id: visualId });
      } catch (err) {
        console.error('Failed to delete visual:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {visuals.map((visual: Doc<'visuals'>) => (
        <div key={visual._id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{visual.title}</h3>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(visual._id)}
            >
              Delete
            </Button>
          </div>
          <ChartRenderer
            visual={visual}
            datasourceId={datasourceId}
            columns={datasource.columns}
            csvDataLoading={csvDataLoading}
            dbLoading={dbLoading}
            tableName={tableName}
            tableLoaded={tableLoaded}
          />
        </div>
      ))}
    </div>
  );
}
