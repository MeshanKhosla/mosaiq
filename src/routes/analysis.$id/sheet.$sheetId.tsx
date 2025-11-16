import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { VisualType } from '~/lib/chart-utils';
import { DEFAULT_VISUAL_SIZE } from '~/lib/constants';
import { AppLayout } from '~/components/app-layout';
import { VisualToolbar } from '~/components/chart/visual-toolbar';
import { VisualCanvas } from '~/components/chart/visual-canvas';
import { SheetTabs } from '~/components/chart/sheet-tabs';
import { ShareDashboardModal } from '~/components/dashboard/share-dashboard-modal';
import { SheetRefreshOverlay } from '~/components/sheet-refresh-overlay';
import { useDuckDbTable } from '~/hooks/use-duckdb-table';

export const Route = createFileRoute('/analysis/$id/sheet/$sheetId')({
  component: SheetPage,
  loader: ({ params }) => {
    // Client-side data fetching will handle this via useQuery hooks
    // Sheet validation happens client-side in the component
    // Auth is already checked by the parent route /analysis/$id
    return { analysisId: params.id, sheetId: params.sheetId };
  },
});

function SheetPage() {
  const { id, sheetId } = Route.useParams();
  const navigate = useNavigate();
  const analysisId = id as Id<'analyses'>;
  const currentSheetId = sheetId as Id<'sheets'>;
  const analysis = useQuery(api.analyses.get, { id: analysisId });
  const sheets = useQuery(api.sheets.getAllByAnalysis, { analysisId });

  // Redirect if sheet doesn't exist
  useEffect(() => {
    if (sheets && sheets.length > 0) {
      const sheetExists = sheets.some((s) => s._id === currentSheetId);
      if (!sheetExists) {
        navigate({
          to: '/analysis/$id/sheet/$sheetId',
          params: { id: analysisId, sheetId: sheets[0]._id },
        });
      }
    }
  }, [sheets, currentSheetId, analysisId, navigate]);

  /**
   * HACKATHON WORKAROUND: Force page refresh on first navigation
   *
   * This is a temporary fix for DuckDB table loading race conditions that cause
   * "Binder Error: Referenced column not found in FROM clause" errors. The issue
   * occurs when charts query tables before they're fully registered in DuckDB.
   *
   * Proper fix would be: Implement proper table registration tracking and query
   * queueing system to ensure all queries wait for table readiness.
   */
  useLayoutEffect(() => {
    const isFirstSheet =
      sheets && sheets.length > 0 && sheets[0]._id === currentSheetId;
    if (!isFirstSheet) return;

    const hasRefreshed = sessionStorage.getItem(`refreshed-${analysisId}`);
    if (!hasRefreshed && !refreshTimeoutRef.current) {
      sessionStorage.setItem(`refreshed-${analysisId}`, 'true');
      setShowRefreshOverlay(true);
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        window.location.reload();
      }, 450);
    }
  }, [currentSheetId, sheets, analysisId]);
  const updateAnalysisName = useMutation(
    api.analyses.updateName,
  ).withOptimisticUpdate((localStore, args) => {
    const existingAnalysis = localStore.getQuery(api.analyses.get, {
      id: args.id,
    });

    if (existingAnalysis !== undefined && existingAnalysis !== null) {
      localStore.setQuery(
        api.analyses.get,
        { id: args.id },
        {
          ...existingAnalysis,
          name: args.name.trim(),
        },
      );
    }
  });
  const createVisual = useMutation(api.visuals.create).withOptimisticUpdate(
    (localStore, args) => {
      const existingVisuals = localStore.getQuery(api.visuals.getBySheet, {
        sheetId: args.sheetId,
      });

      if (existingVisuals !== undefined && existingVisuals !== null) {
        const tempId =
          tempIdRef.current ||
          (`temp-${Date.now()}-${Math.random()}` as Id<'visuals'>);
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
  const visuals = useQuery(api.visuals.getBySheet, {
    sheetId: currentSheetId,
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const hasFocusedRef = useRef<boolean>(false);
  const [selectedVisualId, setSelectedVisualId] =
    useState<Id<'visuals'> | null>(null);
  const tempIdRef = useRef<Id<'visuals'> | null>(null);
  const [showRefreshOverlay, setShowRefreshOverlay] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (analysis) {
      setEditName(analysis.name);
    }
  }, [analysis]);

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (analysis && editName.trim() && editName.trim() !== analysis.name) {
      try {
        await updateAnalysisName({ id: analysisId, name: editName.trim() });
      } catch (error) {
        toast.error('Failed to update analysis name', {
          description:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
        });
        setEditName(analysis.name);
      }
    } else if (analysis) {
      setEditName(analysis.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      if (analysis) {
        setEditName(analysis.name);
      }
      setIsEditingName(false);
    }
  };

  const datasourceId = analysis?.datasourceIds[0];
  const datasource = useQuery(
    api.datasources.get,
    datasourceId ? { id: datasourceId } : 'skip',
  );
  const storageUrl = useQuery(
    api.datasources.getStorageUrl,
    datasourceId ? { datasourceId } : 'skip',
  );
  const { data: csvData, isLoading: csvDataLoading } = useTanstackQuery({
    queryKey: ['csvData', datasourceId],
    enabled: !!storageUrl,
    queryFn: () => fetch(storageUrl!).then((res) => res.text()),
  });

  const tableName = datasource
    ? `${analysisId}_${datasource.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`
    : undefined;

  const { tableLoaded, dbLoading, dbError } = useDuckDbTable({
    csvData,
    tableName,
  });

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
    try {
      const position = getDefaultPosition();

      // Generate temporary ID for optimistic UI updates
      const tempId = `temp-${Date.now()}-${Math.random()}` as Id<'visuals'>;
      tempIdRef.current = tempId;
      setSelectedVisualId(tempId);

      const normalizedAxes = axes
        ? {
            dimensions: axes.dimensions,
            measures: axes.measures?.map((m) =>
              typeof m === 'string' ? { columnId: m, aggregation: 'SUM' } : m,
            ),
          }
        : undefined;

      const visualId = await createVisual({
        sheetId: currentSheetId,
        type,
        position,
        axes: type === 'table' ? undefined : normalizedAxes,
      });

      setSelectedVisualId(visualId);
      tempIdRef.current = null;
    } catch (error) {
      console.error('Failed to create visual:', error);
      setSelectedVisualId(null);
      tempIdRef.current = null;
      toast.error('Failed to create visual', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const selectedVisual =
    visuals?.find((v) => v._id === selectedVisualId) || null;

  const handlePublishToDashboard = () => {
    if (!analysis) {
      return;
    }
    setShowShareModal(true);
  };

  if (dbError) {
    return <div>Failed to initialize DuckDB: {dbError.message}</div>;
  }

  if (!analysis) {
    return null;
  }

  return (
    <AppLayout
      breadcrumbEditingProps={{
        isEditing: isEditingName,
        editName: editName,
        hasFocusedRef: hasFocusedRef,
        onEditClick: () => setIsEditingName(true),
        onNameChange: setEditName,
        onKeyDown: handleNameKeyDown,
        onBlur: handleNameBlur,
        ctaButtons: [
          {
            label: 'Publish to dashboard',
            onClick: handlePublishToDashboard,
            disabled: !analysis,
          },
        ],
      }}
    >
      {showRefreshOverlay && <SheetRefreshOverlay />}
      <ShareDashboardModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        analysisId={analysis._id}
        defaultDashboardName={`${analysis.name} Dashboard`}
      />
      <div className="flex h-[calc(100vh-8rem)] flex-col -mt-6 -mx-6">
        {datasource && (
          <>
            <div className="flex items-center gap-2 border-b border-border/30 px-3 py-1">
              <SheetTabs sheets={sheets ?? undefined} analysisId={analysisId} />
              <VisualToolbar
                onCreateVisual={handleCreateVisual}
                sheetId={currentSheetId}
                columns={datasource.columns}
                selectedVisual={selectedVisual}
                onVisualSelect={(visual) =>
                  setSelectedVisualId(visual?._id || null)
                }
                tableName={tableName}
                tableLoaded={tableLoaded}
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
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
