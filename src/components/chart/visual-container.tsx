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
import { Input } from '~/components/ui/input';

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
  canvasRef?: React.RefObject<HTMLDivElement | null>;
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
  canvasRef,
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
  const deleteVisual = useMutation(
    api.visuals.deleteVisual,
  ).withOptimisticUpdate((localStore, args) => {
    const existingVisuals = localStore.getQuery(api.visuals.getBySheet, {
      sheetId: visual.sheetId,
    });

    if (existingVisuals !== undefined && existingVisuals !== null) {
      // Remove the deleted visual from the list
      const updatedVisuals = existingVisuals.filter((v) => v._id !== args.id);
      localStore.setQuery(
        api.visuals.getBySheet,
        { sheetId: visual.sheetId },
        updatedVisuals,
      );
    }
  });
  const updateTitle = useMutation(api.visuals.updateTitle).withOptimisticUpdate(
    (localStore, args) => {
      const existingVisuals = localStore.getQuery(api.visuals.getBySheet, {
        sheetId: visual.sheetId,
      });

      if (existingVisuals !== undefined && existingVisuals !== null) {
        // Update the visual's title in the list
        const updatedVisuals = existingVisuals.map((v) =>
          v._id === args.id
            ? {
                ...v,
                title: args.title.trim(),
              }
            : v,
        );
        localStore.setQuery(
          api.visuals.getBySheet,
          { sheetId: visual.sheetId },
          updatedVisuals,
        );
      }
    },
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(visual.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync title when visual changes
  useEffect(() => {
    setTitleValue(visual.title);
  }, [visual.title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue !== visual.title) {
      updateTitle({ id: visual._id, title: titleValue });
    } else {
      setTitleValue(visual.title);
    }
  }, [titleValue, visual._id, visual.title, updateTitle]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      } else if (e.key === 'Escape') {
        setTitleValue(visual.title);
        setIsEditingTitle(false);
      }
    },
    [visual.title],
  );

  const handleDrag = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      // Clamp x to prevent dragging horizontally off-screen
      // Prevent y from going negative (upward)
      // Allow y to go infinitely downward
      let clampedX = d.x;
      let clampedY = d.y;

      if (canvasRef?.current) {
        // Get the canvas element's scroll container to account for padding
        const canvasRect = canvasRef.current.getBoundingClientRect();
        // Canvas has px-4 (1rem = 16px padding on each side)
        const padding = 16;
        const minX = 0; // Start of content area (after padding)
        const maxX = canvasRect.width - localPosition.width - padding * 2;

        // Prevent dragging left of content area
        clampedX = Math.max(minX, d.x);
        // Prevent dragging right of content area
        clampedX = Math.min(clampedX, maxX);
        // Prevent dragging above canvas (y < 0)
        clampedY = Math.max(0, d.y);
        // Allow infinite downward dragging (no max clamp)
      } else {
        // Fallback: prevent negative positions
        clampedX = Math.max(0, d.x);
        clampedY = Math.max(0, d.y);
      }

      // Update local state immediately for smooth dragging
      setLocalPosition((prev: typeof visual.position) => ({
        ...prev,
        x: clampedX,
        y: clampedY,
      }));
    },
    [canvasRef, localPosition.width],
  );

  const handleDragStop = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clamp position same as in handleDrag
      let clampedX = d.x;
      let clampedY = d.y;

      if (canvasRef?.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const padding = 16; // px-4 = 1rem = 16px
        const minX = 0;
        const maxX = canvasRect.width - localPosition.width - padding * 2;

        clampedX = Math.max(minX, d.x);
        clampedX = Math.min(clampedX, maxX);
        clampedY = Math.max(0, d.y);
      } else {
        clampedX = Math.max(0, d.x);
        clampedY = Math.max(0, d.y);
      }

      // Update optimistically immediately
      updatePosition({
        id: visual._id,
        position: {
          x: clampedX,
          y: clampedY,
          width: localPosition.width,
          height: localPosition.height,
        },
      });
    },
    [
      visual._id,
      localPosition.width,
      localPosition.height,
      updatePosition,
      canvasRef,
    ],
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
      className="group"
      style={{
        zIndex: 1,
      }}
    >
      <div
        className={`relative flex h-full w-full flex-col rounded border bg-card shadow-sm ${
          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        {/* Thin header with editable title */}
        <div className="flex items-center justify-between border-b border-border px-2 py-1">
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="h-6 text-xs font-medium"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className="flex-1 cursor-pointer truncate text-xs font-medium px-1 py-0.5 rounded hover:bg-muted/50"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {visual.title}
            </h3>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            title="Delete visual"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content - thin wrapper, same width */}
        <div className="flex-1 overflow-hidden">{renderVisualContent()}</div>
      </div>
    </Rnd>
  );
}
