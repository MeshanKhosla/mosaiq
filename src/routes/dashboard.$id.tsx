import { useEffect } from 'react';
import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { fetchAuth } from '~/routes/__root';

export const Route = createFileRoute('/dashboard/$id')({
  component: DashboardLayout,
  beforeLoad: async () => {
    const { userId } = await fetchAuth();
    if (!userId) {
      throw redirect({ to: '/' });
    }
  },
});

function DashboardLayout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardId = id as Id<'dashboards'>;
  const dashboard = useQuery(api.dashboards.getForViewer, { id: dashboardId });
  const analysis = useQuery(
    api.analyses.getForViewer,
    dashboard ? { id: dashboard.sourceAnalysisId } : 'skip',
  );
  const sheets = useQuery(
    api.sheets.getByAnalysisForViewer,
    analysis ? { analysisId: analysis._id } : 'skip',
  );

  useEffect(() => {
    const isBaseRoute = location.pathname === `/dashboard/${dashboardId}`;
    if (isBaseRoute && sheets && sheets.length > 0) {
      navigate({
        to: '/dashboard/$id/sheet/$sheetId',
        params: {
          id: dashboardId,
          sheetId: sheets[0]._id,
        },
        replace: true,
      });
    }
  }, [sheets, dashboardId, navigate, location.pathname]);

  return <Outlet />;
}
