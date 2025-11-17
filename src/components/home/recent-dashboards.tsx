import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';
import { DashboardLink } from '~/components/dashboard-link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecentDashboards() {
  const { data: dashboards } = useSuspenseQuery(
    convexQuery(api.dashboards.list, {}),
  );

  if (dashboards === 'Unauthenticated') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const recentDashboards = [...dashboards]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Recent Dashboards
        </h2>
        {dashboards.length > 0 && (
          <Link
            to="/dashboards"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        )}
      </div>
      {recentDashboards.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No dashboards yet. Create your first dashboard from an analysis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentDashboards.map((dashboard) => (
            <DashboardLink
              key={dashboard._id}
              dashboardId={dashboard._id}
              sourceAnalysisId={dashboard.sourceAnalysisId}
              className="contents"
            >
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                  <CardDescription>
                    {formatDate(dashboard._creationTime)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </DashboardLink>
          ))}
        </div>
      )}
    </div>
  );
}
