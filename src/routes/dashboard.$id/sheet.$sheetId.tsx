import { useEffect, useRef, useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { insertFile } from 'duckdb-wasm-kit';
import { toast } from 'sonner';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { fetchAuth } from '~/routes/__root';
import { VisualCanvas } from '~/components/chart/visual-canvas';
import { DashboardSheetTabs } from '~/components/chart/dashboard-sheet-tabs';
import { useDuckDbContext } from '~/components/duckdb-provider';

export const Route = createFileRoute('/dashboard/$id/sheet/$sheetId')({
  component: DashboardSheetPage,
  beforeLoad: async () => {
    const { userId } = await fetchAuth();
    if (!userId) {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ context, params }) => {
    const dashboardId = params.id as Id<'dashboards'>;
    const sheetId = params.sheetId as Id<'sheets'>;

    const [dashboard, analysis] = await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.dashboards.getForViewer, { id: dashboardId }),
      ),
      context.queryClient
        .ensureQueryData(
          convexQuery(api.dashboards.getForViewer, { id: dashboardId }),
        )
        .then(async (d) => {
          if (!d) return null;
          return await context.queryClient.ensureQueryData(
            convexQuery(api.analyses.getForViewer, { id: d.sourceAnalysisId }),
          );
        }),
    ]);

    if (!dashboard || !analysis) {
      return;
    }

    const sheets = await context.queryClient.ensureQueryData(
      convexQuery(api.sheets.getByAnalysisForViewer, {
        analysisId: dashboard.sourceAnalysisId,
      }),
    );

    if (!sheets || sheets.length === 0) {
      return;
    }

    const sheetExists = sheets.some((s) => s._id === sheetId);
    if (!sheetExists) {
      throw redirect({
        to: '/dashboard/$id/sheet/$sheetId',
        params: {
          id: dashboardId,
          sheetId: sheets[0]._id,
        },
      });
    }

    return { dashboard, analysis, sheets };
  },
});

function DashboardSheetPage() {
  const { id, sheetId } = Route.useParams();
  const dashboardId = id as Id<'dashboards'>;
  const currentSheetId = sheetId as Id<'sheets'>;

  const dashboard = useQuery(api.dashboards.getForViewer, { id: dashboardId });
  const analysis = useQuery(
    api.analyses.getForViewer,
    dashboard ? { id: dashboard.sourceAnalysisId } : 'skip',
  );
  const sheets = useQuery(
    api.sheets.getByAnalysisForViewer,
    dashboard ? { analysisId: dashboard.sourceAnalysisId } : 'skip',
  );

  const updateDashboardName = useMutation(
    api.dashboards.updateName,
  ).withOptimisticUpdate((localStore, args) => {
    const existingDashboard = localStore.getQuery(api.dashboards.getForViewer, {
      id: args.id,
    });

    if (existingDashboard !== undefined && existingDashboard !== null) {
      localStore.setQuery(
        api.dashboards.getForViewer,
        { id: args.id },
        {
          ...existingDashboard,
          name: args.name.trim(),
        },
      );
    }
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const hasFocusedRef = useRef<boolean>(false);

  useEffect(() => {
    if (dashboard) {
      setEditName(dashboard.name);
    }
  }, [dashboard]);

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (dashboard && editName.trim() && editName.trim() !== dashboard.name) {
      try {
        await updateDashboardName({ id: dashboardId, name: editName.trim() });
      } catch (error) {
        toast.error('Failed to update dashboard name', {
          description:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
        });
        setEditName(dashboard.name);
      }
    } else if (dashboard) {
      setEditName(dashboard.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      if (dashboard) {
        setEditName(dashboard.name);
      }
      setIsEditingName(false);
    }
  };

  const datasourceId = analysis?.datasourceIds[0];
  const datasource = useQuery(
    api.datasources.getForViewer,
    datasourceId ? { id: datasourceId } : 'skip',
  );
  const storageUrl = useQuery(
    api.datasources.getStorageUrlForViewer,
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

  const { db, loading: dbLoading, error: dbError } = useDuckDbContext();

  let tableName: string | undefined;
  if (datasource && analysis) {
    tableName = `${analysis._id}_${datasource.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
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

        // Verify the table exists and is ready before marking as loaded
        try {
          const conn = await db.connect();
          const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
          await conn.query(`SELECT 1 FROM ${escapedTableName} LIMIT 1`);
          await conn.close();
        } catch (verifyErr) {
          // If verification fails, wait a bit and retry once
          await new Promise((resolve) => setTimeout(resolve, 100));
          const conn = await db.connect();
          const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
          await conn.query(`SELECT 1 FROM ${escapedTableName} LIMIT 1`);
          await conn.close();
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

  const [selectedVisualId, setSelectedVisualId] =
    useState<Id<'visuals'> | null>(null);

  if (dbError) {
    return <div>Failed to initialize DuckDB: {dbError.message}</div>;
  }

  if (!dashboard || !analysis) {
    return null;
  }

  return (
    <AppLayout
      breadcrumbEditingProps={{
        isEditing: isEditingName,
        editName: editName,
        hasFocusedRef: hasFocusedRef,
        onEditClick: dashboard.isAuthor
          ? () => setIsEditingName(true)
          : undefined,
        onNameChange: setEditName,
        onKeyDown: handleNameKeyDown,
        onBlur: handleNameBlur,
      }}
    >
      <div className="flex h-[calc(100vh-8rem)] flex-col -mt-6 -mx-6">
        {datasource && (
          <>
            <div className="flex items-center gap-2 border-b border-border/30 px-3 py-1">
              <DashboardSheetTabs
                sheets={sheets ?? undefined}
                dashboardId={dashboardId}
              />
            </div>
            {sheets && sheets.length > 0 && (
              <div className="flex-1 overflow-auto px-6">
                <VisualCanvas
                  sheetId={currentSheetId}
                  datasourceId={datasource._id}
                  columns={datasource.columns}
                  csvDataLoading={csvDataLoading}
                  dbLoading={dbLoading}
                  tableName={tableName}
                  tableLoaded={tableLoaded}
                  selectedVisualId={selectedVisualId}
                  onVisualSelect={setSelectedVisualId}
                  readOnly={true}
                  visualsQuery={api.visuals.getBySheetForViewer}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
