import { useMemo } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AppLayout } from '~/components/app-layout';
import { Upload } from '~/components/upload';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.dashboards.list, {})),
      context.queryClient.ensureQueryData(convexQuery(api.analyses.list, {})),
      context.queryClient.ensureQueryData(
        convexQuery(api.datasources.list, {}),
      ),
    ]);
  },
});

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HomePage() {
  const { data: user } = useSuspenseQuery(
    convexQuery(api.auth.getCurrentUser, {}),
  );
  const dashboards = useConvexQuery(api.dashboards.list);
  const analyses = useConvexQuery(api.analyses.list);
  const datasources = useConvexQuery(api.datasources.list);

  const recentDashboards = useMemo(() => {
    if (!dashboards) return [];
    return [...dashboards]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);
  }, [dashboards]);

  const recentAnalyses = useMemo(() => {
    if (!analyses) return [];
    return [...analyses]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);
  }, [analyses]);

  const recentDatasources = useMemo(() => {
    if (!datasources) return [];
    return [...datasources]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);
  }, [datasources]);

  return (
    <AppLayout>
      <div className="space-y-4">
        {user && (
          <>
            <Upload />

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Recent Dashboards
                  </h2>
                  {dashboards && dashboards.length > 0 && (
                    <Link
                      to="/dashboards"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {!dashboards ? (
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
                ) : recentDashboards.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No dashboards yet. Create your first dashboard from an
                        analysis.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recentDashboards.map((dashboard) => (
                      <Link
                        key={dashboard._id}
                        to="/dashboard/$id"
                        params={{ id: dashboard._id }}
                        className="contents"
                        preload="intent"
                      >
                        <Card className="hover:bg-accent transition-colors cursor-pointer">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {dashboard.name}
                            </CardTitle>
                            <CardDescription>
                              {formatDate(dashboard._creationTime)}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Recent Analyses
                  </h2>
                  {analyses && analyses.length > 0 && (
                    <Link
                      to="/analyses"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {!analyses ? (
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
                ) : recentAnalyses.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No analyses yet. Create your first analysis from a
                        datasource.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recentAnalyses.map((analysis) => (
                      <Link
                        key={analysis._id}
                        to="/analysis/$id"
                        params={{ id: analysis._id }}
                        className="contents"
                        preload="intent"
                      >
                        <Card className="hover:bg-accent transition-colors cursor-pointer">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {analysis.name}
                            </CardTitle>
                            <CardDescription>
                              {formatDate(analysis._creationTime)}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Recent Datasources
                  </h2>
                  {datasources && datasources.length > 0 && (
                    <Link
                      to="/datasources"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {!datasources ? (
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
                ) : recentDatasources.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No datasources yet. Upload your first CSV file to get
                        started.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recentDatasources.map((datasource) => (
                      <Link
                        key={datasource._id}
                        to="/datasource/$id"
                        params={{ id: datasource._id }}
                        className="contents"
                        preload="intent"
                      >
                        <Card className="hover:bg-accent transition-colors cursor-pointer">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {datasource.name}
                            </CardTitle>
                            <CardDescription>
                              {formatDate(datasource._creationTime)}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
