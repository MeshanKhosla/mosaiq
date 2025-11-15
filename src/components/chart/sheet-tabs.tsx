import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

interface SheetTabsProps {
  sheets: Array<Doc<'sheets'>>;
  analysisId: Id<'analyses'>;
}

export function SheetTabs({ sheets, analysisId }: SheetTabsProps) {
  const navigate = useNavigate();
  const params = useParams({ from: '/analysis/$id/sheet/$sheetId' });
  const activeSheetId = (params.sheetId as Id<'sheets'>) || null;

  const createSheet = useMutation(api.sheets.createSheet);
  const updateName = useMutation(api.sheets.updateName).withOptimisticUpdate(
    (localStore, args) => {
      const existingSheets = localStore.getQuery(api.sheets.getAllByAnalysis, {
        analysisId,
      });

      if (existingSheets !== undefined && existingSheets !== null) {
        const updatedSheets = existingSheets.map((sheet) =>
          sheet._id === args.sheetId
            ? { ...sheet, name: args.name.trim() }
            : sheet,
        );
        localStore.setQuery(
          api.sheets.getAllByAnalysis,
          { analysisId },
          updatedSheets,
        );
      }
    },
  );
  const deleteSheet = useMutation(api.sheets.deleteSheet);

  const [editingSheetId, setEditingSheetId] = useState<Id<'sheets'> | null>(
    null,
  );
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const maxSheetsReached = sheets.length >= 5;

  useEffect(() => {
    if (editingSheetId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSheetId]);

  const handleCreateSheet = useCallback(async () => {
    if (maxSheetsReached) {
      toast.error('Maximum of 5 sheets allowed');
      return;
    }

    try {
      const newSheetId = await createSheet({ analysisId });
      await navigate({
        to: '/analysis/$id/sheet/$sheetId',
        params: {
          id: analysisId,
          sheetId: newSheetId,
        },
      });
      toast.success('Sheet created');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create sheet';
      toast.error('Failed to create sheet', {
        description: errorMessage,
      });
    }
  }, [analysisId, createSheet, maxSheetsReached, navigate]);

  const handleStartEdit = useCallback((sheet: Doc<'sheets'>) => {
    setEditingSheetId(sheet._id);
    setEditName(sheet.name);
  }, []);

  const handleSaveEdit = useCallback(
    async (sheetId: Id<'sheets'>) => {
      const trimmedName = editName.trim();
      if (!trimmedName) {
        setEditingSheetId(null);
        return;
      }

      const sheet = sheets.find((s) => s._id === sheetId);
      if (!sheet || sheet.name === trimmedName) {
        setEditingSheetId(null);
        return;
      }

      try {
        await updateName({ sheetId, name: trimmedName });
        setEditingSheetId(null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to rename sheet';
        toast.error('Failed to rename sheet', {
          description: errorMessage,
        });
        setEditName(sheet.name);
        setEditingSheetId(null);
      }
    },
    [editName, sheets, updateName],
  );

  const handleCancelEdit = useCallback(
    (sheetId: Id<'sheets'>) => {
      const sheet = sheets.find((s) => s._id === sheetId);
      if (sheet) {
        setEditName(sheet.name);
      }
      setEditingSheetId(null);
    },
    [sheets],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, sheetId: Id<'sheets'>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit(sheetId);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit(sheetId);
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  const handleDeleteSheet = useCallback(
    async (sheetId: Id<'sheets'>, e: React.MouseEvent) => {
      e.stopPropagation();

      if (sheets.length <= 1) {
        toast.error('Cannot delete the last remaining sheet');
        return;
      }

      const remainingSheets = sheets.filter((s) => s._id !== sheetId);
      const isDeletingActiveSheet = sheetId === activeSheetId;

      try {
        await deleteSheet({ sheetId });
        if (isDeletingActiveSheet && remainingSheets.length > 0) {
          await navigate({
            to: '/analysis/$id/sheet/$sheetId',
            params: {
              id: analysisId,
              sheetId: remainingSheets[0]._id,
            },
          });
        }
        toast.success('Sheet deleted');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete sheet';
        toast.error('Failed to delete sheet', {
          description: errorMessage,
        });
      }
    },
    [deleteSheet, sheets, navigate, analysisId, activeSheetId],
  );

  if (sheets.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 border-b border-border bg-background px-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {sheets.map((sheet) => {
          const isActive = sheet._id === activeSheetId;
          const isEditing = editingSheetId === sheet._id;
          const canDelete = sheets.length > 1;

          return (
            <div
              key={sheet._id}
              className={cn(
                'group relative flex items-center gap-1 border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  navigate({
                    to: '/analysis/$id/sheet/$sheetId',
                    params: {
                      id: analysisId,
                      sheetId: sheet._id,
                    },
                  });
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(sheet);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                  isActive && 'text-foreground',
                )}
              >
                {isEditing ? (
                  <Input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveEdit(sheet._id)}
                    onKeyDown={(e) => handleKeyDown(e, sheet._id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 min-w-[80px] text-xs"
                  />
                ) : (
                  <>
                    <span>{sheet.name}</span>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteSheet(sheet._id, e)}
                        className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Delete sheet"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCreateSheet}
        disabled={maxSheetsReached}
        className="h-8 w-8 shrink-0 p-0"
        title={
          maxSheetsReached ? 'Maximum of 5 sheets allowed' : 'Create new sheet'
        }
      >
        <Plus className="h-4 w-4" />
      </Button>
      {maxSheetsReached && (
        <span className="text-xs text-muted-foreground shrink-0">(5/5)</span>
      )}
    </div>
  );
}
