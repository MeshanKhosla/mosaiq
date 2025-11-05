import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { Check, Pencil, X } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { DataTable } from '~/components/data-table';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

export const Route = createFileRoute('/datasource/$id')({
  component: DatasourcePage,
});

function DatasourcePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const datasourceId = id as Id<'datasources'>;
  const datasource = useQuery(api.datasources.get, { id: datasourceId });
  const updateName = useMutation(api.datasources.updateName);
  const createAnalysis = useMutation(api.analyses.create);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);

  // Calculate input width based on text length (text-3xl font-bold approx 18px per char)
  const getInputWidth = (text: string) => {
    return Math.max(200, text.length);
  };

  const handleEditClick = () => {
    if (datasource) {
      setEditName(datasource.name);
      setIsEditing(true);
    }
  };

  const handleNameChange = (value: string) => {
    setEditName(value);
  };

  const handleSave = async () => {
    if (!datasource || !editName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await updateName({
        datasourceId,
        name: editName.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
  };

  const handleUseInAnalysis = async () => {
    if (!datasource) {
      return;
    }

    setIsCreatingAnalysis(true);
    try {
      const analysisName = `${datasource.name} Analysis`;
      const analysisId = await createAnalysis({
        datasourceId,
        name: analysisName,
      });
      await navigate({
        to: '/analysis/$id',
        params: { id: analysisId },
      });
    } catch (error) {
      console.error('Failed to create analysis:', error);
    } finally {
      setIsCreatingAnalysis(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {datasource ? (
          <>
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="text-3xl font-bold tracking-tight h-auto py-2"
                        style={{ width: `${getInputWidth(editName)}px` }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSave();
                          } else if (e.key === 'Escape') {
                            handleCancel();
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSave}
                        disabled={isSaving || !editName.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold tracking-tight">
                        {datasource.name}
                      </h1>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEditClick}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  onClick={handleUseInAnalysis}
                  disabled={isCreatingAnalysis}
                  className="bg-[hsl(var(--ring))] text-white hover:bg-[hsl(var(--ring))]/90 self-center"
                >
                  {isCreatingAnalysis ? 'Creating...' : 'Use in analysis'}
                </Button>
              </div>
              <p className="text-muted-foreground">
                {datasource.fileName} • {datasource.data?.length ?? 0} rows
              </p>
            </div>

            <div>
              <DataTable datasourceId={datasourceId} />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="h-9 w-64 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
            </div>
            <div>
              <DataTable datasourceId={datasourceId} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
