import { useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { DataTable } from '~/components/data-table';
import { Button } from '~/components/ui/button';

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
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);
  const hasFocusedRef = useRef(false);

  const handleEditClick = () => {
    if (datasource && !isEditing) {
      setEditName(datasource.name);
      setIsEditing(true);
      hasFocusedRef.current = false;
    }
  };

  const handleSave = async () => {
    const newName = editName.trim();
    if (!datasource || !newName || newName === datasource.name) {
      setIsEditing(false);
      hasFocusedRef.current = false;
      return;
    }

    try {
      await updateName({
        datasourceId,
        name: newName,
      });
      setIsEditing(false);
      hasFocusedRef.current = false;
    } catch (error) {
      console.error('Failed to update name:', error);
      setIsEditing(false);
      hasFocusedRef.current = false;
    }
  };

  const handleCancel = () => {
    if (datasource) {
      setEditName(datasource.name);
    }
    setIsEditing(false);
    hasFocusedRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
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
                {isEditing ? (
                  <input
                    ref={(el) => {
                      if (el && !hasFocusedRef.current) {
                        hasFocusedRef.current = true;
                        el.focus();
                        el.select();
                      }
                    }}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="text-3xl font-bold tracking-tight outline-none bg-transparent border-none p-0 m-0 w-auto min-w-[200px]"
                    style={{
                      width: `${Math.max(200, editName.length * 18)}px`,
                    }}
                  />
                ) : (
                  <h1
                    className="text-3xl font-bold tracking-tight cursor-pointer underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-muted-foreground/60"
                    onClick={handleEditClick}
                  >
                    {datasource.name}
                  </h1>
                )}
                <Button
                  onClick={handleUseInAnalysis}
                  disabled={isCreatingAnalysis}
                  className="bg-[hsl(var(--ring))] text-white hover:bg-[hsl(var(--ring))]/90 self-center"
                >
                  {isCreatingAnalysis ? 'Creating...' : 'Use in analysis'}
                </Button>
              </div>
              <p className="text-muted-foreground mt-2">
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
