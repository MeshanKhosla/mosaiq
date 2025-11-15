import { useNavigate, useParams } from '@tanstack/react-router';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { cn } from '~/lib/utils';

interface DashboardSheetTabsProps {
  sheets: Array<Doc<'sheets'>>;
  dashboardId: Id<'dashboards'>;
}

export function DashboardSheetTabs({
  sheets,
  dashboardId,
}: DashboardSheetTabsProps) {
  const navigate = useNavigate();
  const params = useParams({ from: '/dashboard/$id/sheet/$sheetId' });
  const activeSheetId = (params.sheetId as Id<'sheets'>) || null;

  if (sheets.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto">
        {sheets.map((sheet) => {
          const isActive = sheet._id === activeSheetId;

          return (
            <div
              key={sheet._id}
              className={cn(
                'group relative flex items-center gap-1 border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  navigate({
                    to: '/dashboard/$id/sheet/$sheetId',
                    params: {
                      id: dashboardId,
                      sheetId: sheet._id,
                    },
                  });
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                  isActive && 'text-foreground',
                )}
              >
                <span>{sheet.name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
