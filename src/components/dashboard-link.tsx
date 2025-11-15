import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface DashboardLinkProps {
  dashboardId: Id<'dashboards'>;
  sourceAnalysisId: Id<'analyses'>;
  children: React.ReactNode;
  className?: string;
  preload?: 'intent' | false;
}

export function DashboardLink({
  dashboardId,
  sourceAnalysisId,
  children,
  className,
  preload = 'intent',
}: DashboardLinkProps) {
  const sheets = useQuery(api.sheets.getByAnalysisForViewer, {
    analysisId: sourceAnalysisId,
  });
  const firstSheetId = sheets && sheets.length > 0 ? sheets[0]._id : null;

  if (firstSheetId) {
    return (
      <Link
        to="/dashboard/$id/sheet/$sheetId"
        params={{ id: dashboardId, sheetId: firstSheetId }}
        className={className}
        preload={preload}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/dashboard/$id"
      params={{ id: dashboardId }}
      className={className}
      preload={preload}
    >
      {children}
    </Link>
  );
}
