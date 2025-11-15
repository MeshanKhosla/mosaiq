import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useMutation } from 'convex/react';
import { X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ChartRenderer } from './chart-renderer';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type BaseChart from '~/charts/base-chart';
import type { VisualType } from './visual-toolbar';
import { MIN_VISUAL_SIZE } from '~/lib/constants';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import BarChart from '~/charts/bar-chart';
import PieChart from '~/charts/pie-chart';
import LineChart from '~/charts/line-chart';

type Column = Doc<'datasources'>['columns'][number];

function getChartInstance(type: VisualType): BaseChart | null {
  switch (type) {
    case 'table':
      return null;
    case 'bar_chart':
      return new BarChart();
    case 'pie_chart':
      return new PieChart();
    case 'line_chart':
      return new LineChart();
    default:
      return new BarChart();
  }
}

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

  // Compute display title: use stored title, or compute from axes, or fallback to type name
  const displayTitle = useMemo(() => {
    if (visual.title) {
      return visual.title;
    }

    // Check if axes are valid
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
          .map((id) => columns.find((c) => c._id === id)?.name)
          .filter((name): name is string => name !== undefined);

        if (dimensionNames.length > 0 && measureNames.length > 0) {
          return `${dimensionNames.join(', ')} by ${measureNames.join(', ')}`;
        }
      }
    }

    // Fallback to visual type name
    return visual.type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [visual.title, visual.type, visual.axes, columns]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(displayTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync title when visual changes
  useEffect(() => {
    setTitleValue(displayTitle);
  }, [displayTitle]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
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
    // Update local state immediately for smooth dragging
    // Don't clamp during drag to prevent jitter - bounds enforced on drag stop
    setLocalPosition((prev: typeof visual.position) => ({
      ...prev,
      x: d.x,
      y: Math.max(0, d.y), // Prevent dragging above canvas (y < 0)
    }));
  }, []);

  const handleDragStop = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Constrain X to canvas bounds, allow infinite Y movement
      let clampedX = d.x;
      const clampedY = Math.max(0, d.y); // Prevent dragging above canvas (y < 0)

      if (canvasRef?.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const padding = 12; // px-3 = 0.75rem = 12px
        const minX = 0;
        const maxX = canvasRect.width - localPosition.width - padding * 2;

        // Clamp X to stay within canvas bounds
        clampedX = Math.max(minX, Math.min(clampedX, maxX));
      } else {
        // Fallback: prevent negative X
        clampedX = Math.max(0, clampedX);
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
      dragHandleClassName="visual-drag-handle"
      cancel="input, button"
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
        <div className="visual-drag-handle flex items-center gap-2 border-b border-border px-2 py-1 cursor-move">
          {isEditingTitle ? (
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
              className="inline-block cursor-pointer text-xs font-medium px-1 py-0.5 rounded hover:bg-muted/50 shrink-0"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {displayTitle}
            </h3>
          )}
          <div className="flex-1" />
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
        </div>

        {/* Content - thin wrapper, same width */}
        <div className="flex-1 overflow-hidden">{renderVisualContent()}</div>
      </div>
    </Rnd>
  );
}
