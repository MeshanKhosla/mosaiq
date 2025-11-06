import { useEffect, useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { BarChartVisual } from './charts/bar-chart-visual';
import { LineChartVisual } from './charts/line-chart-visual';
import { PieChartVisual } from './charts/pie-chart-visual';
import { TableVisual } from './charts/table-visual';
import type { Visual } from '~/lib/types';
import { Input } from '~/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Button } from '~/components/ui/button';

interface VisualCardProps {
  visual: Visual;
  isSelected: boolean;
  onSelect: () => void;
}

export function VisualCard({ visual, isSelected, onSelect }: VisualCardProps) {
  const updateVisual = useMutation(api.visuals.update);
  const deleteVisual = useMutation(api.visuals.deleteVisual);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(visual.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    setTitle(visual.title);
  }, [visual.title]);

  const handleTitleBlur = () => {
    if (title.trim() && title !== visual.title) {
      updateVisual({ id: visual._id, title: title.trim() });
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitle(visual.title);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await deleteVisual({ id: visual._id });
    setShowDeleteDialog(false);
  };

  const renderVisual = () => {
    switch (visual.type) {
      case 'bar_chart':
        return <BarChartVisual visualId={visual._id} />;
      case 'line_chart':
        return <LineChartVisual visualId={visual._id} />;
      case 'pie_chart':
        return <PieChartVisual visualId={visual._id} />;
      case 'table':
        return <TableVisual visualId={visual._id} />;
      default:
        return <div>Unknown visual type</div>;
    }
  };

  return (
    <>
      <Card
        className={`h-full w-full flex flex-col transition-all ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
        onClick={onSelect}
      >
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0 border-b">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="drag-handle cursor-move">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="h-7 text-sm font-semibold"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                className="text-sm font-semibold truncate cursor-text"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {visual.title}
              </h3>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-3 flex-1 overflow-hidden">
          {renderVisual()}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Visual</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{visual.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
