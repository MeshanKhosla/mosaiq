import { useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Table } from '@tanstack/react-table';
import { AppLayout } from '~/components/app-layout';
import { DataTable } from '~/components/data-table/data-table';
import { DatasourceHeader } from '~/components/datasource/datasource-header';
import { DataTableSearch } from '~/components/datasource/data-table-search';
import { ColumnVisibilityDropdown } from '~/components/datasource/column-visibility-dropdown';
import { AnalysisLinksList } from '~/components/datasource/analysis-links-list';

export const Route = createFileRoute('/datasource/$id')({
  component: DatasourcePage,
});

function DatasourcePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const datasourceId = id as Id<'datasources'>;
  const datasource = useQuery(api.datasources.get, { id: datasourceId });
  const analyses = useQuery(api.analyses.getByDatasourceId, {
    datasourceId,
  });
  const updateName = useMutation(api.datasources.updateName);
  const createAnalysis = useMutation(api.analyses.create);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [tableInstance, setTableInstance] = useState<Table<
    Record<string, string | number>
  > | null>(null);
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
        <DatasourceHeader
          datasource={datasource}
          isEditing={isEditing}
          editName={editName}
          hasFocusedRef={hasFocusedRef}
          onEditClick={handleEditClick}
          onNameChange={setEditName}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onUseInAnalysis={handleUseInAnalysis}
          isCreatingAnalysis={isCreatingAnalysis}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Preview data
              </p>
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
            {tableInstance && (
              <ColumnVisibilityDropdown tableInstance={tableInstance} />
            )}
          </div>
          <DataTable
            datasourceId={datasourceId}
            searchValue={searchValue}
            onTableReady={setTableInstance}
          />
        </div>

        <AnalysisLinksList analyses={analyses} />
      </div>
    </AppLayout>
  );
}
