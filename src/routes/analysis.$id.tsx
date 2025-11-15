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

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisLayout,
  beforeLoad: async () => {
    const { userId } = await fetchAuth();
    if (!userId) {
      throw redirect({ to: '/' });
    }
  },
});

function AnalysisLayout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const analysisId = id as Id<'analyses'>;
  const sheets = useQuery(api.sheets.getAllByAnalysis, { analysisId });

  useEffect(() => {
    const isBaseRoute = location.pathname === `/analysis/${analysisId}`;
    if (isBaseRoute && sheets && sheets.length > 0) {
      navigate({
        to: '/analysis/$id/sheet/$sheetId',
        params: {
          id: analysisId,
          sheetId: sheets[0]._id,
        },
        replace: true,
      });
    }
  }, [sheets, analysisId, navigate, location.pathname]);

  return <Outlet />;
}
