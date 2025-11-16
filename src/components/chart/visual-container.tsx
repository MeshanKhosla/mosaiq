import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useMutation } from 'convex/react';
import { X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ChartRenderer } from './chart-renderer';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { MIN_VISUAL_SIZE } from '~/lib/constants';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { getChartInstance } from '~/lib/chart-utils';

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
  readOnly?: boolean;
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
  readOnly = false,
}: VisualContainerProps) {
  const [localPosition, setLocalPosition] = useState(() => visual.position);

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

  // Generate auto-title from axes if no custom title is set
  const displayTitle = useMemo(() => {
    if (visual.title) {
      return visual.title;
    }

    if (visual.type !== 'table' && visual.axes) {
      const chartInstance = getChartInstance(visual.type);
      const isValid = chartInstance?.validateAxes(visual.axes) === true;

      if (
        isValid &&
        visual.axes.dimensions &&
        visual.axes.measures &&
        visual.axes.dimensions.length > 0 &&
        visual.axes.measures.length > 0
      ) {
        const dimensionNames = visual.axes.dimensions
          .map((id) => columns.find((c) => c._id === id)?.name)
          .filter((name): name is string => name !== undefined);
        const measureNames = visual.axes.measures
          .map((m) => {
            const columnId = typeof m === 'string' ? m : m.columnId;
            return columns.find((c) => c._id === columnId)?.name;
          })
          .filter((name): name is string => name !== undefined);

        if (dimensionNames.length > 0 && measureNames.length > 0) {
          return `${dimensionNames.join(', ')} by ${measureNames.join(', ')}`;
        }
      }
    }

    return visual.type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [visual.title, visual.type, visual.axes, columns]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(() => displayTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue !== displayTitle) {
      updateTitle({ id: visual._id, title: titleValue });
    } else {
      setTitleValue(displayTitle);
    }
  }, [titleValue, visual._id, displayTitle, updateTitle]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      } else if (e.key === 'Escape') {
        setTitleValue(displayTitle);
        setIsEditingTitle(false);
      }
    },
    [displayTitle],
  );

  const handleDrag = useCallback((_e: any, d: { x: number; y: number }) => {
    // Clamp Y during drag to provide visual feedback (snap back to top)
    const clampedY = Math.max(0, d.y);

    setLocalPosition((prev: typeof visual.position) => ({
      ...prev,
      x: d.x,
      y: clampedY,
    }));
  }, []);

  const handleDragStop = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      let clampedX = d.x;
      let clampedY = d.y;

      if (canvasRef?.current) {
        const canvasContentWidth = canvasRef.current.clientWidth;
        const minX = 0;
        const maxX = Math.max(0, canvasContentWidth - localPosition.width);

        clampedX = Math.max(minX, Math.min(clampedX, maxX));
      } else {
        clampedX = Math.max(0, clampedX);
      }

      // Clamp Y to prevent dragging above the canvas (snap back to top)
      clampedY = Math.max(0, clampedY);

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
      let clampedY = position.y;
      let finalHeight = ref.offsetHeight;

      // Clamp Y during resize to provide visual feedback
      if (clampedY < 0) {
        // Adjust height when resizing upward beyond canvas top
        finalHeight = finalHeight + clampedY;
        clampedY = 0;

        // Ensure minimum height is maintained
        if (finalHeight < MIN_VISUAL_SIZE) {
          finalHeight = MIN_VISUAL_SIZE;
        }
      }

      setLocalPosition((prev: typeof visual.position) => ({
        ...prev,
        x: position.x,
        y: clampedY,
        width: ref.offsetWidth,
        height: finalHeight,
      }));
    },
    [visual.position],
  );

  const handleResizeStop = useCallback(
    (
      _e: any,
      _direction: string,
      ref: HTMLElement,
      _delta: any,
      position: { x: number; y: number },
    ) => {
      let clampedX = position.x;
      let clampedY = position.y;
      const finalWidth = ref.offsetWidth;
      let finalHeight = ref.offsetHeight;

      // Clamp X to prevent resizing beyond canvas bounds horizontally
      if (canvasRef?.current) {
        const canvasContentWidth = canvasRef.current.clientWidth;
        const minX = 0;
        const maxX = Math.max(0, canvasContentWidth - finalWidth);
        clampedX = Math.max(minX, Math.min(clampedX, maxX));
      } else {
        clampedX = Math.max(0, clampedX);
      }

      // Clamp Y to prevent resizing above the canvas (snap back to top)
      // When resizing upward (north, northwest, northeast), adjust height if needed
      if (clampedY < 0) {
        // If Y is negative, we need to adjust both Y and height
        // The height should be reduced by the amount Y went negative
        finalHeight = finalHeight + clampedY; // clampedY is negative, so this reduces height
        clampedY = 0;

        // Ensure minimum height is maintained
        if (finalHeight < MIN_VISUAL_SIZE) {
          finalHeight = MIN_VISUAL_SIZE;
        }
      }

      updatePosition({
        id: visual._id,
        position: {
          x: clampedX,
          y: clampedY,
          width: finalWidth,
          height: finalHeight,
        },
      });
    },
    [visual._id, updatePosition, canvasRef],
  );

  const handleDelete = useCallback(() => {
    deleteVisual({ id: visual._id });
  }, [visual._id, deleteVisual]);

  const renderVisualContent = () => {
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
        sheetId={visual.sheetId}
      />
    );
  };

  const containerContent = (
    <div
      className={`relative flex h-full w-full flex-col rounded border bg-card shadow-sm ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <div
        className={`flex items-center gap-2 border-b border-border px-2 py-1 ${
          readOnly ? '' : 'visual-drag-handle cursor-move'
        }`}
      >
        {isEditingTitle && !readOnly ? (
          <Input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="h-6 text-xs font-medium flex-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            className={`text-xs font-medium px-1 py-0.5 rounded shrink-0 ${
              readOnly ? '' : 'cursor-pointer hover:bg-muted/50'
            }`}
            onDoubleClick={
              readOnly
                ? undefined
                : (e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }
            }
          >
            {displayTitle}
          </h3>
        )}
        <div className="flex-1" />
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100 shrink-0"
            title="Delete visual"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">{renderVisualContent()}</div>
    </div>
  );

  if (readOnly) {
    return (
      <div
        style={{
          position: 'absolute',
          left: localPosition.x,
          top: localPosition.y,
          width: localPosition.width,
          height: localPosition.height,
          zIndex: 1,
        }}
      >
        {containerContent}
      </div>
    );
  }

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
      dragHandleClassName="visual-drag-handle"
      cancel="input, button"
      style={{
        zIndex: 1,
      }}
    >
      {containerContent}
    </Rnd>
  );
}
