import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import GridLayout from 'react-grid-layout';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { VisualCard } from './visual-card';
import type { Id } from '../../../convex/_generated/dataModel';
import type { Visual } from '~/lib/types';
import { Button } from '~/components/ui/button';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface VisualCanvasProps {
  visuals: Array<Visual>;
  selectedVisualId: Id<'visuals'> | null;
  onVisualSelect: (visualId: Id<'visuals'> | null) => void;
  onAddVisual: () => void;
}

export function VisualCanvas({
  visuals,
  selectedVisualId,
  onVisualSelect,
  onAddVisual,
}: VisualCanvasProps) {
  const updateVisual = useMutation(api.visuals.update);

  const layout = useMemo(() => {
    return visuals.map((visual) => ({
      i: visual._id,
      x: visual.position.x,
      y: visual.position.y,
      w: visual.position.width,
      h: visual.position.height,
    }));
  }, [visuals]);

  const handleLayoutChange = (newLayout: Array<GridLayout.Layout>) => {
    // Update positions for changed items
    newLayout.forEach((item) => {
      const visual = visuals.find((v) => v._id === item.i);
      if (
        visual &&
        (visual.position.x !== item.x ||
          visual.position.y !== item.y ||
          visual.position.width !== item.w ||
          visual.position.height !== item.h)
      ) {
        updateVisual({
          id: visual._id,
          position: {
            x: item.x,
            y: item.y,
            width: item.w,
            height: item.h,
          },
        });
      }
    });
  };

  if (visuals.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No visuals yet</p>
            <p className="text-sm">Add your first visual to get started</p>
          </div>
          <Button onClick={onAddVisual}>
            <Plus className="h-4 w-4 mr-2" />
            Add Visual
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background p-4">
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={60}
        width={1200}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {visuals.map((visual) => (
          <div key={visual._id}>
            <VisualCard
              visual={visual}
              isSelected={visual._id === selectedVisualId}
              onSelect={() => onVisualSelect(visual._id)}
            />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
