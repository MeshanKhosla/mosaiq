import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { fetchAuth } from '~/routes/__root';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisLayout,
  beforeLoad: async ({ context, params, location }) => {
    const { userId } = await fetchAuth();
    if (!userId) {
      throw redirect({ to: '/' });
    }

    const analysisId = params.id as Id<'analyses'>;

    const pathname = location.pathname || location.href || '';
    const isSheetRoute = /\/analysis\/[^/]+\/sheet\/[^/]+/.test(pathname);

    if (isSheetRoute) {
      return;
    }

    const sheets = await context.queryClient.ensureQueryData(
      convexQuery(api.sheets.getAllByAnalysis, { analysisId }),
    );

    if (!sheets || sheets.length === 0) {
      return;
    }

    throw redirect({
      to: '/analysis/$id/sheet/$sheetId',
      params: {
        id: analysisId,
        sheetId: sheets[0]._id,
      },
    });
  },
});

function AnalysisLayout() {
  return <Outlet />;
}
