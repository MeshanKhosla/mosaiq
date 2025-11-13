import { useCallback, useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useMutation } from 'convex/react';
import { X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ChartRenderer } from './chart-renderer';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { MIN_VISUAL_SIZE } from '~/lib/constants';
import { DataTable } from '~/components/data-table/data-table';
import { Button } from '~/components/ui/button';

type Column = Doc<'datasources'>['columns'][number];

interface VisualContainerProps {
  visual: Doc<'visuals'>;
  datasourceId: Id<'datasources'>;
  columns: Array<Column>;
  csvDataLoading: boolean;
  dbLoading: boolean;
  tableName?: string;
  tableLoaded: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function VisualContainer({
  visual,
  datasourceId,
  columns,
  csvDataLoading,
  dbLoading,
  tableName,
  tableLoaded,
  isSelected,
  onSelect,
}: VisualContainerProps) {
  // Local state for immediate UI updates during drag/resize
  const [localPosition, setLocalPosition] = useState(visual.position);

  // Sync with server data when it changes
  useEffect(() => {
    setLocalPosition(visual.position);
  }, [visual.position]);

  const updatePosition = useMutation(
    api.visuals.updatePosition,
  ).withOptimisticUpdate((localStore, args) => {
    const { id, position } = args;
    const existingVisuals = localStore.getQuery(api.visuals.getBySheet, {
      sheetId: visual.sheetId,
    });

    if (existingVisuals !== undefined && existingVisuals !== null) {
      // Create a new array with the updated visual position
      const updatedVisuals = existingVisuals.map((v) =>
        v._id === id
          ? {
              ...v,
              position,
            }
          : v,
      );
      localStore.setQuery(
        api.visuals.getBySheet,
        { sheetId: visual.sheetId },
        updatedVisuals,
      );
    }
  });
  const deleteVisual = useMutation(api.visuals.deleteVisual);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDrag = useCallback((_e: any, d: { x: number; y: number }) => {
    // Update local state immediately for smooth dragging
    setLocalPosition((prev: typeof visual.position) => ({
      ...prev,
      x: d.x,
      y: d.y,
    }));
  }, []);

  const handleDragStop = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Update optimistically immediately
      updatePosition({
        id: visual._id,
        position: {
          x: d.x,
          y: d.y,
          width: localPosition.width,
          height: localPosition.height,
        },
      });
    },
    [visual._id, localPosition.width, localPosition.height, updatePosition],
  );

  const handleResize = useCallback(
    (
      _e: any,
      _direction: any,
      ref: HTMLElement,
      _delta: any,
      position: { x: number; y: number },
    ) => {
      // Update local state immediately for smooth resizing
      setLocalPosition((prev: typeof visual.position) => ({
        ...prev,
        x: position.x,
        y: position.y,
        width: ref.offsetWidth,
        height: ref.offsetHeight,
      }));
    },
    [visual.position],
  );

  const handleResizeStop = useCallback(
    (
      _e: any,
      _direction: any,
      ref: HTMLElement,
      _delta: any,
      position: { x: number; y: number },
    ) => {
      // Update optimistically immediately
      updatePosition({
        id: visual._id,
        position: {
          x: position.x,
          y: position.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        },
      });
    },
    [visual._id, updatePosition],
  );

  const handleDelete = useCallback(() => {
    deleteVisual({ id: visual._id });
  }, [visual._id, deleteVisual]);

  const renderVisualContent = () => {
    if (visual.type === 'table') {
      return <DataTable datasourceId={datasourceId} searchValue="" />;
    }

    return (
      <ChartRenderer
        visual={visual}
        datasourceId={datasourceId}
        columns={columns}
        csvDataLoading={csvDataLoading}
        dbLoading={dbLoading}
        tableName={tableName}
        tableLoaded={tableLoaded}
        width={localPosition.width}
        height={localPosition.height}
      />
    );
  };

  return (
    <Rnd
      size={{ width: localPosition.width, height: localPosition.height }}
      position={{ x: localPosition.x, y: localPosition.y }}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      minWidth={MIN_VISUAL_SIZE}
      minHeight={MIN_VISUAL_SIZE}
      bounds="parent"
      className="group"
      style={{
        zIndex: 1,
      }}
    >
      <div
        className={`relative h-full w-full rounded-lg border bg-card shadow-sm ${
          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
          <h3 className="text-sm font-semibold">{visual.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            title="Delete visual"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-3rem)] overflow-auto p-4">
          {renderVisualContent()}
        </div>
      </div>
    </Rnd>
  );
}
