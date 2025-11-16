import { useMemo } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AppLayout } from '~/components/app-layout';
import { Upload } from '~/components/upload';
import { AnalysisLink } from '~/components/analysis-link';
import { DashboardLink } from '~/components/dashboard-link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/')({
  component: HomePage,
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
  const { data: session, isPending } = authClient.useSession();
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

  if (isPending) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="relative pt-8 pb-8 min-h-[25vh]">
            <div
              className="absolute inset-0 -z-10 overflow-hidden"
              style={{
                background: `
                  radial-gradient(circle at 20% 10%, hsl(var(--ring)) 0%, transparent 60%),
                  radial-gradient(circle at 80% 15%, hsl(var(--chart-1)) 0%, transparent 60%),
                  radial-gradient(circle at 50% 5%, hsl(var(--ring)) 0%, transparent 50%)
                `,
                opacity: 0.3,
                filter: 'blur(120px)',
              }}
            />
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: `
                  radial-gradient(ellipse 150% 100% at top, hsl(var(--ring)) 0%, transparent 80%)
                `,
                opacity: 0.2,
                filter: 'blur(80px)',
              }}
            />
            <div className="w-full space-y-4 px-4">
              <div className="flex flex-col items-center space-y-4 w-full">
                <Skeleton className="w-full h-20" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
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
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Upload />
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">
                  Welcome to Mosaiq
                </CardTitle>
                <CardDescription>
                  Sign in to upload and analyze your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full" size="lg">
                  <Link to="/signin">Sign In</Link>
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              throw new Error(
                'Sentry Test Error - This is a test error to verify Sentry is working',
              );
            }}
          >
            Test Sentry Error
          </Button>
        </div>
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
                  <DashboardLink
                    key={dashboard._id}
                    dashboardId={dashboard._id}
                    sourceAnalysisId={dashboard.sourceAnalysisId}
                    className="contents"
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
                  </DashboardLink>
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
                  <AnalysisLink
                    key={analysis._id}
                    analysisId={analysis._id}
                    className="contents"
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
                  </AnalysisLink>
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
      </div>
    </AppLayout>
  );
}
