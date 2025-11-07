import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { parseCsvToData } from '~/lib/file-utils';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const analysisId = id as Id<'analyses'>;
  const analysis = useQuery(api.analyses.get, { id: analysisId });

  const datasourceId = analysis?.datasourceIds[0];
  const datasource = useQuery(
    api.datasources.get,
    datasourceId ? { id: datasourceId } : 'skip',
  );
  const storageUrl = useQuery(
    api.datasources.getStorageUrl,
    datasourceId
      ? {
          datasourceId: datasourceId,
        }
      : 'skip',
  );
  const { data: csvData } = useTanstackQuery({
    queryKey: ['csvData', datasourceId],
    enabled: !!storageUrl,
    queryFn: () =>
      fetch(storageUrl!)
        .then((res) => res.text())
        .then(parseCsvToData),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {analysis ? (
          <>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {analysis.name}
              </h1>
              <p className="text-muted-foreground">
                Analysis with {analysis.datasourceIds.length} datasource
                {analysis.datasourceIds.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="h-9 w-64 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
