import { useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { ExternalLink, Globe } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { authClient } from '~/lib/auth-client';
import { DataTable } from '~/components/data-table/data-table';
import { DataTableSearch } from '~/components/datasource/data-table-search';
import { AnalysisLinksList } from '~/components/datasource/analysis-links-list';
import { DataTableSkeleton } from '~/components/data-table/skeleton';

export const Route = createFileRoute('/datasource/$id')({
  component: DatasourcePage,
  validateSearch: () => ({}),
  loader: async (opts) => {
    if (typeof window === 'undefined') {
      return;
    }
    await Promise.all([
      opts.context.queryClient.ensureQueryData(
        convexQuery(api.datasources.get, {
          id: opts.params.id as Id<'datasources'>,
        }),
      ),
      opts.context.queryClient.ensureQueryData(
        convexQuery(api.analyses.getByDatasourceId, {
          datasourceId: opts.params.id as Id<'datasources'>,
        }),
      ),
    ]);
  },
});

function DatasourcePage() {
  const { id } = Route.useParams();
  const { data: session, isPending: isLoadingSession } =
    authClient.useSession();
  const navigate = useNavigate();
  const datasourceId = id as Id<'datasources'>;
  const { data: datasource } = useSuspenseQuery(
    convexQuery(api.datasources.get, { id: datasourceId }),
  );
  const { data: analyses } = useSuspenseQuery(
    convexQuery(api.analyses.getByDatasourceId, {
      datasourceId,
    }),
  );
  const updateName = useMutation(api.datasources.updateName);
  const createAnalysis = useMutation(api.analyses.create);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const hasFocusedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleEditClick = () => {
    if (datasource && !isEditing) {
      setEditName(datasource.name);
      setIsEditing(true);
      hasFocusedRef.current = false;
    }
  };

  const handleSave = async () => {
    if (!datasource) {
      return;
    }
    const newName = editName.trim();
    if (!newName || newName === datasource.name) {
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
      const { analysisId, sheetId } = await createAnalysis({
        datasourceId,
        name: analysisName,
      });
      await navigate({
        to: '/analysis/$id/sheet/$sheetId',
        params: { id: analysisId, sheetId },
      });
    } catch (error) {
      console.error('Failed to create analysis:', error);
    } finally {
      setIsCreatingAnalysis(false);
    }
  };

  if (isLoadingSession) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Datasource</h1>
            <p className="text-muted-foreground">
              View and manage your datasource
            </p>
          </div>
          <DataTableSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    navigate({ to: '/' });
    return null;
  }

  if (!datasource) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Datasource</h1>
            <p className="text-muted-foreground">
              View and manage your datasource
            </p>
          </div>
          <div className="rounded-md border">
            <div className="p-8 text-center text-muted-foreground">
              Datasource not found.
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbEditingProps={{
        isEditing,
        editName,
        hasFocusedRef,
        onEditClick: handleEditClick,
        onNameChange: setEditName,
        onKeyDown: handleKeyDown,
        onBlur: handleBlur,
        ctaButtons: [
          {
            label: isCreatingAnalysis ? 'Creating...' : 'Use in analysis',
            onClick: handleUseInAnalysis,
            disabled: isCreatingAnalysis,
          },
        ],
      }}
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Preview data
              </p>
              <>
                <span className="text-muted-foreground/50">•</span>
                <p className="text-sm text-muted-foreground">
                  {datasource.fileName}
                </p>
                {(datasource.type ?? 'csv') === 'url' &&
                  datasource.sourceUrl && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <a
                        href={datasource.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span className="max-w-[200px] truncate">
                          {datasource.sourceUrl}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
              </>
            </div>
            <DataTableSearch
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              isExpanded={isSearchExpanded}
              onExpand={() => {
                setIsSearchExpanded(true);
                setTimeout(() => {
                  searchInputRef.current?.focus();
                }, 0);
              }}
              onCollapse={() => setIsSearchExpanded(false)}
              searchInputRef={searchInputRef}
            />
          </div>
          <DataTable datasourceId={datasourceId} searchValue={searchValue} />
        </div>

        <AnalysisLinksList analyses={analyses ?? undefined} />
      </div>
    </AppLayout>
  );
}
