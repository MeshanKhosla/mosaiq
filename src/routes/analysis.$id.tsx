import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { insertFile, useDuckDb } from 'duckdb-wasm-kit';
import { toast } from 'sonner';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { VisualType } from '~/components/chart/visual-toolbar';
import { DEFAULT_VISUAL_SIZE } from '~/lib/constants';
import { AppLayout } from '~/components/app-layout';
import { VisualToolbar } from '~/components/chart/visual-toolbar';
import { VisualCanvas } from '~/components/chart/visual-canvas';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisPage,
  loader: async ({ context, params }) => {
    const analysisId = params.id as Id<'analyses'>;
    return await context.queryClient.ensureQueryData(
      convexQuery(api.analyses.get, { id: analysisId }),
    );
  },
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const analysisId = id as Id<'analyses'>;
  const analysis = useQuery(api.analyses.get, { id: analysisId });
  const sheet = useQuery(api.sheets.getByAnalysis, { analysisId });
  const createDashboard = useMutation(api.dashboards.create);
  const createVisual = useMutation(api.visuals.create).withOptimisticUpdate(
    (localStore, args) => {
      const existingVisuals = localStore.getQuery(api.visuals.getBySheet, {
        sheetId: args.sheetId,
      });

      if (existingVisuals !== undefined && existingVisuals !== null) {
        const tempId = `temp-${Date.now()}-${Math.random()}` as Id<'visuals'>;
        const tempVisual = {
          _id: tempId,
          _creationTime: Date.now(),
          sheetId: args.sheetId,
          type: args.type,
          title: args.title,
          position: args.position,
          createdBy: '',
          axes: args.type === 'table' ? undefined : args.axes,
        };

        const updatedVisuals = [...existingVisuals, tempVisual];
        localStore.setQuery(
          api.visuals.getBySheet,
          { sheetId: args.sheetId },
          updatedVisuals,
        );
      }
    },
  );
  const visuals = useQuery(
    api.visuals.getBySheet,
    sheet ? { sheetId: sheet._id } : 'skip',
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedVisualId, setSelectedVisualId] =
    useState<Id<'visuals'> | null>(null);

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

  const { db, loading: dbLoading, error: dbError } = useDuckDb();

  let tableName: string | undefined;
  if (datasource) {
    tableName = `${analysisId}_${datasource.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
  }

  const [tableLoaded, setTableLoaded] = useState(false);

  useEffect(() => {
    if (!db || !csvData || !tableName || tableLoaded) return;

    const loadData = async () => {
      try {
        const file = new File([csvData], 'data.csv', { type: 'text/csv' });

        try {
          await insertFile(db, file, tableName);
        } catch (err) {
          // File already exists
        }
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

  const getDefaultPosition = (): {
    x: number;
    y: number;
    width: number;
    height: number;
  } => {
    const gridCols = 3;
    const gridGap = 20;
    const visualCount = visuals?.length ?? 0;
    const col = visualCount % gridCols;
    const row = Math.floor(visualCount / gridCols);
    return {
      x: col * (DEFAULT_VISUAL_SIZE + gridGap) + gridGap,
      y: row * (DEFAULT_VISUAL_SIZE + gridGap) + gridGap,
      width: DEFAULT_VISUAL_SIZE,
      height: DEFAULT_VISUAL_SIZE,
    };
  };

  const handleCreateVisual = async (
    type: VisualType,
    axes?: { dimensions?: Array<string>; measures?: Array<string> },
  ) => {
    if (!sheet) return;

    try {
      const position = getDefaultPosition();
      const visualId = await createVisual({
        sheetId: sheet._id,
        type,
        position,
        axes: type === 'table' ? undefined : axes,
      });
      setSelectedVisualId(visualId);
    } catch (error) {
      console.error('Failed to create visual:', error);
      toast.error('Failed to create visual', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const selectedVisual =
    visuals?.find((v) => v._id === selectedVisualId) || null;

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

  if (dbError) {
    return <div>Failed to initialize DuckDB: {dbError.message}</div>;
  }

  if (!analysis) {
    return (
      <AppLayout>
        <div>
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
        </div>
      </AppLayout>
    );
  }

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
      <div className="flex h-[calc(100vh-8rem)] flex-col -mt-6">
        {sheet && datasource && (
          <>
            <VisualToolbar
              onCreateVisual={handleCreateVisual}
              sheetId={sheet._id}
              columns={datasource.columns}
              selectedVisual={selectedVisual}
              onVisualSelect={(visual) =>
                setSelectedVisualId(visual?._id || null)
              }
            />
            <div className="flex-1 overflow-auto">
              <VisualCanvas
                sheetId={sheet._id}
                datasourceId={datasource._id}
                columns={datasource.columns}
                csvDataLoading={csvDataLoading}
                dbLoading={dbLoading}
                tableName={tableName}
                tableLoaded={tableLoaded}
                selectedVisualId={selectedVisualId}
                onVisualSelect={setSelectedVisualId}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
