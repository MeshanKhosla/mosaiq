import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { Sheet } from '~/lib/types';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '~/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';

interface SheetTabsProps {
  analysisId: Id<'analyses'>;
  sheets: Array<Sheet>;
  selectedSheetId: Id<'sheets'> | null;
  onSheetSelect: (sheetId: Id<'sheets'>) => void;
}

export function SheetTabs({
  analysisId,
  sheets,
  selectedSheetId,
  onSheetSelect,
}: SheetTabsProps) {
  const createSheet = useMutation(api.sheets.create);
  const updateSheet = useMutation(api.sheets.update);
  const deleteSheet = useMutation(api.sheets.deleteSheet);

  const [editingSheetId, setEditingSheetId] = useState<Id<'sheets'> | null>(
    null,
  );
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<'sheets'> | null>(
    null,
  );

  const handleCreateSheet = async () => {
    const newSheetId = await createSheet({ analysisId });
    onSheetSelect(newSheetId);
  };

  const handleRename = (sheet: Sheet) => {
    setEditingSheetId(sheet._id);
    setEditName(sheet.name);
  };

  const handleSaveRename = async () => {
    if (editingSheetId && editName.trim()) {
      await updateSheet({ id: editingSheetId, name: editName.trim() });
      setEditingSheetId(null);
      setEditName('');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      // If deleting selected sheet, select first remaining sheet
      if (deleteConfirmId === selectedSheetId) {
        const remainingSheets = sheets.filter((s) => s._id !== deleteConfirmId);
        if (remainingSheets.length > 0) {
          onSheetSelect(remainingSheets[0]._id);
        }
      }
      await deleteSheet({ id: deleteConfirmId });
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      <div className="border-b bg-card">
        <div className="flex items-center gap-2 px-4">
          <Tabs
            value={selectedSheetId ?? undefined}
            onValueChange={(value) => onSheetSelect(value as Id<'sheets'>)}
            className="flex-1"
          >
            <TabsList className="h-12 bg-transparent border-0 p-0">
              {sheets.map((sheet) => (
                <ContextMenu key={sheet._id}>
                  <ContextMenuTrigger>
                    <TabsTrigger
                      value={sheet._id}
                      className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      {editingSheetId === sheet._id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={handleSaveRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveRename();
                            } else if (e.key === 'Escape') {
                              setEditingSheetId(null);
                              setEditName('');
                            }
                          }}
                          className="h-8 w-32"
                          autoFocus
                        />
                      ) : (
                        <span>{sheet.name}</span>
                      )}
                    </TabsTrigger>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleRename(sheet)}>
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => setDeleteConfirmId(sheet._id)}
                      className="text-destructive"
                      disabled={sheets.length === 1}
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={handleCreateSheet}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sheet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sheet? All visuals in this
              sheet will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
