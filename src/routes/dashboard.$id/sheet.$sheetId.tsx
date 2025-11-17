import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  useSuspenseQuery,
  useQuery as useTanstackQuery,
} from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { VisualCanvas } from '~/components/chart/visual-canvas';
import { SheetTabs } from '~/components/chart/sheet-tabs';
import { useDuckDbTable } from '~/hooks/use-duckdb-table';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/dashboard/$id/sheet/$sheetId')({
  component: DashboardSheetPage,
  loader: async (opts) => {
    if (typeof window === 'undefined') {
      return;
    }
    const dashboardId = opts.params.id as Id<'dashboards'>;
    const dashboardQuery = convexQuery(api.dashboards.getForViewer, {
      id: dashboardId,
    });
    await opts.context.queryClient.ensureQueryData(dashboardQuery);
    const dashboard = opts.context.queryClient.getQueryData<Doc<'dashboards'>>(
      dashboardQuery.queryKey,
    );
    if (dashboard) {
      await Promise.all([
        opts.context.queryClient.ensureQueryData(
          convexQuery(api.analyses.getForViewer, {
            id: dashboard.sourceAnalysisId,
          }),
        ),
        opts.context.queryClient.ensureQueryData(
          convexQuery(api.sheets.getByAnalysisForViewer, {
            analysisId: dashboard.sourceAnalysisId,
          }),
        ),
      ]);
    }
  },
});

function DashboardSheetPage() {
  const { id, sheetId } = Route.useParams();
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const dashboardId = id as Id<'dashboards'>;
  const currentSheetId = sheetId as Id<'sheets'>;

  const { data: dashboard } = useSuspenseQuery(
    convexQuery(api.dashboards.getForViewer, { id: dashboardId }),
  );

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
  const [selectedVisualId, setSelectedVisualId] =
    useState<Id<'visuals'> | null>(null);

  const datasourceId = analysis?.datasourceIds[0];
  const datasource = useQuery(
    api.datasources.getForViewer,
    datasourceId ? { id: datasourceId } : 'skip',
  );
  const storageUrl = useQuery(
    api.datasources.getStorageUrlForViewer,
    datasourceId ? { datasourceId } : 'skip',
  );
  const { data: csvData, isLoading: csvDataLoading } = useTanstackQuery({
    queryKey: ['csvData', datasourceId],
    enabled: !!storageUrl,
    queryFn: () => fetch(storageUrl!).then((res) => res.text()),
  });

  const tableName =
    datasource && analysis
      ? `${analysis._id}_${datasource.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`
      : undefined;

  const { tableLoaded, dbLoading, dbError } = useDuckDbTable({
    csvData,
    tableName,
  });

  useEffect(() => {
    if (!sheets || sheets.length === 0) return;
    const sheetExists = sheets.some((s) => s._id === currentSheetId);
    if (!sheetExists) {
      navigate({
        to: '/dashboard/$id/sheet/$sheetId',
        params: { id: dashboardId, sheetId: sheets[0]._id },
      });
    }
  }, [sheets, currentSheetId, dashboardId, navigate]);

  useEffect(() => {
    if (dashboard) {
      setEditName(dashboard.name);
    }
  }, [dashboard]);

  if (!session) {
    navigate({ to: '/' });
    return null;
  }

  if (!dashboard) {
    return null;
  }

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (editName.trim() && editName.trim() !== dashboard.name) {
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
    } else {
      setEditName(dashboard.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditName(dashboard.name);
      setIsEditingName(false);
    }
  };

  if (dbError) {
    return <div>Failed to initialize DuckDB: {dbError.message}</div>;
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
              <SheetTabs sheets={sheets} dashboardId={dashboardId} />
            </div>
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
