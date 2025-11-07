import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { insertFile, runQuery, useDuckDb } from 'duckdb-wasm-kit';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { CreateChartDialog } from '~/components/chart/create-chart-dialog';
import { VisualsList } from '~/components/chart/visuals-list';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const analysisId = id as Id<'analyses'>;
  const analysis = useQuery(api.analyses.get, { id: analysisId });
  const sheet = useQuery(api.sheets.getByAnalysis, { analysisId });
  const createDashboard = useMutation(api.dashboards.create);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const datasourceId = analysis?.datasourceIds[0];
  const datasource = useQuery(
    api.datasources.get,
    datasourceId ? { id: datasourceId } : 'skip',
  );
  const storageUrl = useQuery(
    api.datasources.getStorageUrl,
    datasourceId
      ? {
          datasourceId: datasourceId,
        }
      : 'skip',
  );
  const { data: csvData, isLoading: csvDataLoading } = useTanstackQuery({
    queryKey: ['csvData', datasourceId],
    enabled: !!storageUrl,
    queryFn: () => fetch(storageUrl!).then((res) => res.text()),
  });

  // Initialize DuckDB at analysis level
  const { db, loading: dbLoading, error: dbError } = useDuckDb();

  // Create unique table name based on datasource name + random ID
  const tableName = useMemo(() => {
    if (!datasource) return undefined;
    // Sanitize datasource name for use as table name
    const sanitizedName = datasource.name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase();
    const randomId = Math.random().toString(36).substring(2, 9);
    return `${sanitizedName}_${randomId}`;
  }, [datasource]);

  const [tableLoaded, setTableLoaded] = useState(false);

  // Load CSV into DuckDB once when DB and CSV data are ready
  useEffect(() => {
    if (!db || !csvData || !tableName || tableLoaded) return;

    const loadData = async () => {
      try {
        // Drop table if it exists (in case we're reloading)
        await runQuery(db, `DROP TABLE IF EXISTS "${tableName}"`);

        // Create File from CSV string
        const file = new File([csvData], 'data.csv', { type: 'text/csv' });

        // Insert CSV into DuckDB with unique table name
        await insertFile(db, file, tableName);
        setTableLoaded(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load CSV into DuckDB';
        console.error('Failed to load CSV into DuckDB:', err);
        toast.error('Failed to load data', {
          description: errorMessage,
        });
      }
    };

    loadData();
  }, [db, csvData, tableName, tableLoaded]);

  // Handle DuckDB initialization errors
  useEffect(() => {
    if (dbError) {
      console.error('DuckDB initialization error:', dbError);
      toast.error('Failed to initialize DuckDB', {
        description: dbError.message,
      });
    }
  }, [dbError]);

  const handlePublishToDashboard = async () => {
    if (!analysis) {
      return;
    }

    setIsPublishing(true);
    try {
      const dashboardName = `${analysis.name} Dashboard`;
      const dashboardId = await createDashboard({
        analysisId: analysis._id,
        name: dashboardName,
      });
      toast.success('Dashboard created successfully', {
        description: `"${dashboardName}" has been published to dashboard.`,
      });
      await navigate({
        to: '/dashboard/$id',
        params: { id: dashboardId },
      });
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      toast.error('Failed to publish to dashboard', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <AppLayout
      breadcrumbEditingProps={{
        ctaButtons: [
          {
            label: isPublishing ? 'Publishing...' : 'Publish to dashboard',
            onClick: handlePublishToDashboard,
            disabled: isPublishing || !analysis,
          },
        ],
      }}
    >
      <div className="space-y-6">
        {analysis ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {analysis.name}
                </h1>
                <p className="text-muted-foreground">
                  Analysis with {analysis.datasourceIds.length} datasource
                  {analysis.datasourceIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              {sheet && datasource && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Create Bar Chart
                </Button>
              )}
            </div>
            {sheet && datasource && (
              <>
                <VisualsList
                  sheetId={sheet._id}
                  datasourceId={datasource._id}
                  csvDataLoading={csvDataLoading}
                  dbLoading={dbLoading}
                  tableName={tableName}
                  tableLoaded={tableLoaded}
                />
                <CreateChartDialog
                  open={createDialogOpen}
                  onOpenChange={setCreateDialogOpen}
                  sheetId={sheet._id}
                  columns={datasource.columns}
                />
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="h-9 w-64 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
