import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { SheetTabs } from '~/components/analysis/sheet-tabs';
import { VisualSidebar } from '~/components/analysis/visual-sidebar';
import { VisualCanvas } from '~/components/analysis/visual-canvas';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const analysisId = id as Id<'analyses'>;

  const analysis = useQuery(api.analyses.get, { id: analysisId });
  const sheets = useQuery(api.sheets.list, analysis ? { analysisId } : 'skip');
  const createSheet = useMutation(api.sheets.create);

  const [selectedSheetId, setSelectedSheetId] = useState<Id<'sheets'> | null>(
    null,
  );
  const [selectedVisualId, setSelectedVisualId] =
    useState<Id<'visuals'> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visuals = useQuery(
    api.visuals.list,
    selectedSheetId ? { sheetId: selectedSheetId } : 'skip',
  );

  // Auto-create first sheet if none exist
  useEffect(() => {
    if (analysis && sheets && sheets.length === 0) {
      createSheet({ analysisId }).then((newSheetId) => {
        setSelectedSheetId(newSheetId);
      });
    }
  }, [analysis, sheets, analysisId, createSheet]);

  // Auto-select first sheet when sheets load
  useEffect(() => {
    if (sheets && sheets.length > 0 && !selectedSheetId) {
      setSelectedSheetId(sheets[0]._id);
    }
  }, [sheets, selectedSheetId]);

  // Get datasource details for sidebar
  const datasources = useQuery(api.datasources.list, analysis ? {} : 'skip');

  const analysisDatasources = datasources?.filter((ds) =>
    analysis?.datasourceIds.includes(ds._id),
  );

  const handleVisualSelect = (visualId: Id<'visuals'> | null) => {
    setSelectedVisualId(visualId);
    if (visualId) {
      setSidebarOpen(true);
    }
  };

  const handleAddVisual = () => {
    setSelectedVisualId(null);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedVisualId(null);
  };

  const selectedVisual =
    visuals?.find((v) => v._id === selectedVisualId) ?? null;

  if (!analysis) {
    return (
      <AppLayout>
        <div className="space-y-4 p-6">
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="h-5 w-96 animate-pulse rounded bg-muted" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Sheet Tabs */}
        {sheets && selectedSheetId && (
          <SheetTabs
            analysisId={analysisId}
            sheets={sheets}
            selectedSheetId={selectedSheetId}
            onSheetSelect={setSelectedSheetId}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Visual Canvas */}
          <div className="flex-1 overflow-hidden">
            {visuals && selectedSheetId ? (
              <VisualCanvas
                visuals={visuals}
                selectedVisualId={selectedVisualId}
                onVisualSelect={handleVisualSelect}
                onAddVisual={handleAddVisual}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">
                  Loading...
                </div>
              </div>
            )}
          </div>

          {/* Visual Sidebar */}
          {sidebarOpen && selectedSheetId && analysisDatasources && (
            <VisualSidebar
              sheetId={selectedSheetId}
              datasources={analysisDatasources}
              selectedVisual={selectedVisual}
              onClose={handleCloseSidebar}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
