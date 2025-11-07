import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';

export const Route = createFileRoute('/dashboard/$id')({
  component: DashboardPage,
});

function DashboardPage() {
  const { id } = Route.useParams();
  const dashboardId = id as Id<'dashboards'>;
  const dashboard = useQuery(api.dashboards.get, { id: dashboardId });

  return (
    <AppLayout>
      <div className="space-y-6">
        {dashboard ? (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {dashboard.name}
            </h1>
            <p className="text-muted-foreground">
              Dashboard content will be displayed here
            </p>
          </div>
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
