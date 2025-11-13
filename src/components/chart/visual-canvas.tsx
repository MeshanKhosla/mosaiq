import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { VisualContainer } from './visual-container';
import type { Doc, Id } from '../../../convex/_generated/dataModel';

type Column = Doc<'datasources'>['columns'][number];

interface VisualCanvasProps {
  sheetId: Id<'sheets'>;
  datasourceId: Id<'datasources'>;
  columns: Array<Column>;
  csvDataLoading: boolean;
  dbLoading: boolean;
  tableName?: string;
  tableLoaded: boolean;
  selectedVisualId?: Id<'visuals'> | null;
  onVisualSelect?: (id: Id<'visuals'> | null) => void;
}

export function VisualCanvas({
  sheetId,
  datasourceId,
  columns,
  csvDataLoading,
  dbLoading,
  tableName,
  tableLoaded,
  selectedVisualId,
  onVisualSelect,
}: VisualCanvasProps) {
  const visuals = useQuery(api.visuals.getBySheet, { sheetId });

  if (visuals === undefined || visuals === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading visuals...</div>
      </div>
    );
  }

  if (visuals.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No visuals yet. Click a visual type in the toolbar to create one.
          </p>
        </div>
      </div>
    );
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only deselect if clicking directly on the canvas, not on a visual
    if (e.target === e.currentTarget) {
      onVisualSelect?.(null);
    }
  };

  return (
    <div
      className="relative h-full w-full overflow-auto bg-muted/20"
      onClick={handleCanvasClick}
    >
      {visuals.map((visual) => (
        <VisualContainer
          key={visual._id}
          visual={visual}
          datasourceId={datasourceId}
          columns={columns}
          csvDataLoading={csvDataLoading}
          dbLoading={dbLoading}
          tableName={tableName}
          tableLoaded={tableLoaded}
          isSelected={selectedVisualId === visual._id}
          onSelect={() => onVisualSelect?.(visual._id)}
        />
      ))}
    </div>
  );
}
