import { useRef, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronDown, Search, X } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Table } from '@tanstack/react-table';
import { AppLayout } from '~/components/app-layout';
import { DataTable } from '~/components/data-table';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

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
        <div>
          <div className="flex items-baseline justify-between gap-4">
            {datasource ? (
              <>
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
              </>
            ) : (
              <div className="h-9 w-64 animate-pulse rounded bg-muted" />
            )}
            <Button
              onClick={handleUseInAnalysis}
              disabled={isCreatingAnalysis || !datasource}
              className="bg-[hsl(var(--ring))] text-white hover:bg-[hsl(var(--ring))]/90 self-center"
            >
              {isCreatingAnalysis ? 'Creating...' : 'Use in analysis'}
            </Button>
          </div>
          {datasource ? (
            <p className="text-muted-foreground mt-2">
              {datasource.fileName} • {datasource.data?.length ?? 0} rows
            </p>
          ) : (
            <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Preview data
              </p>
              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    if (!isSearchExpanded) {
                      setIsSearchExpanded(true);
                      setTimeout(() => {
                        searchInputRef.current?.focus();
                      }, 0);
                    }
                  }}
                  className={`p-1.5 hover:bg-accent rounded-md transition-all duration-200 ${
                    isSearchExpanded
                      ? 'opacity-0 w-0 pointer-events-none'
                      : 'opacity-100 w-auto'
                  }`}
                  aria-label="Search rows"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                </button>
                <div
                  className={`relative flex items-center transition-all duration-200 ease-in-out overflow-hidden ${
                    isSearchExpanded
                      ? 'opacity-100 w-[200px] ml-2'
                      : 'opacity-0 w-0'
                  }`}
                >
                  <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search rows..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onBlur={() => {
                      if (!searchValue) {
                        setIsSearchExpanded(false);
                      }
                    }}
                    className="pl-8 pr-8 h-8 w-[200px]"
                  />
                  <button
                    onClick={() => {
                      setSearchValue('');
                      setIsSearchExpanded(false);
                    }}
                    className="absolute right-2 p-0.5 hover:bg-accent rounded-sm z-10"
                    aria-label="Close search"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
            {tableInstance && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  className="w-56"
                >
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Columns
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="flex items-center gap-1 px-2 py-1">
                    <DropdownMenuItem
                      className="flex-1 justify-center px-2 py-1.5 text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        tableInstance
                          .getAllColumns()
                          .filter((column) => column.getCanHide())
                          .forEach((column) => {
                            column.toggleVisibility(true);
                          });
                      }}
                    >
                      Select All
                    </DropdownMenuItem>
                    <div className="h-4 w-px bg-border" />
                    <DropdownMenuItem
                      className="flex-1 justify-center px-2 py-1.5 text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        tableInstance
                          .getAllColumns()
                          .filter((column) => column.getCanHide())
                          .forEach((column) => {
                            column.toggleVisibility(false);
                          });
                      }}
                    >
                      Deselect All
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-[300px] overflow-y-auto">
                    {tableInstance
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                            onSelect={(e) => {
                              e.preventDefault();
                            }}
                          >
                            {column.id}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <DataTable
            datasourceId={datasourceId}
            searchValue={searchValue}
            onTableReady={setTableInstance}
          />
        </div>

        {analyses !== undefined && (
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Used in analyses
            </p>
            {analyses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not used in any analyses yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analyses.map((analysis) => (
                  <Link
                    key={analysis._id}
                    to="/analysis/$id"
                    params={{ id: analysis._id }}
                    className="text-sm text-primary inline-flex items-center px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent transition-colors"
                  >
                    {analysis.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
