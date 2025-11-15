import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { fetchAuth } from '~/routes/__root';

export const Route = createFileRoute('/dashboard/$id')({
  component: DashboardLayout,
  beforeLoad: async ({ context, params, location }) => {
    const { userId } = await fetchAuth();
    if (!userId) {
      throw redirect({ to: '/' });
    }

    const dashboardId = params.id as Id<'dashboards'>;

    const pathname = location.pathname || location.href || '';
    const isSheetRoute = /\/dashboard\/[^/]+\/sheet\/[^/]+/.test(pathname);

    if (isSheetRoute) {
      return;
    }

    const dashboard = await context.queryClient.ensureQueryData(
      convexQuery(api.dashboards.getForViewer, { id: dashboardId }),
    );

    if (!dashboard) {
      return;
    }

    const analysis = await context.queryClient.ensureQueryData(
      convexQuery(api.analyses.getForViewer, {
        id: dashboard.sourceAnalysisId,
      }),
    );

    if (!analysis) {
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

    throw redirect({
      to: '/dashboard/$id/sheet/$sheetId',
      params: {
        id: dashboardId,
        sheetId: sheets[0]._id,
      },
    });
  },
});

function DashboardLayout() {
  return <Outlet />;
}
