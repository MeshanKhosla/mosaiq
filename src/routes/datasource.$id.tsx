import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { DataTable } from '~/components/data-table';

export const Route = createFileRoute('/datasource/$id')({
  component: DatasourcePage,
});

function DatasourcePage() {
  const { id } = Route.useParams();
  const datasourceId = id as Id<'datasources'>;
  const datasource = useQuery(api.datasources.get, { id: datasourceId });

  return (
    <AppLayout>
      <div className="space-y-6">
        {datasource ? (
          <>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {datasource.name}
              </h1>
              <p className="text-muted-foreground">
                {datasource.fileName} • {datasource.data?.length ?? 0} rows
              </p>
            </div>

            <div>
              <DataTable datasourceId={datasourceId} />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="h-9 w-64 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
            </div>
            <div>
              <DataTable datasourceId={datasourceId} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
