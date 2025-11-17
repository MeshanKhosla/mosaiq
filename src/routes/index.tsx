import { Link, createFileRoute } from '@tanstack/react-router';
import { convexQuery } from '@convex-dev/react-query';
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
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';
import { RecentDashboards } from '~/components/home/recent-dashboards';
import { RecentAnalyses } from '~/components/home/recent-analyses';
import { RecentDatasources } from '~/components/home/recent-datasources';

export const Route = createFileRoute('/')({
  loader: async (opts) => {
    if (typeof window === 'undefined') {
      return;
    }
    await Promise.all([
      opts.context.queryClient.ensureQueryData(
        convexQuery(api.dashboards.list, {}),
      ),
      opts.context.queryClient.ensureQueryData(
        convexQuery(api.analyses.list, {}),
      ),
      opts.context.queryClient.ensureQueryData(
        convexQuery(api.datasources.list, {}),
      ),
    ]);
  },
  component: HomePage,
});

function HomePage() {
  const { data: session, isPending: isLoadingSession } =
    authClient.useSession();

  if (isLoadingSession) {
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
            <RecentDashboards />
            <RecentAnalyses />
            <RecentDatasources />
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
        <Upload />

        <div className="space-y-6">
          <RecentDashboards />
          <RecentAnalyses />
          <RecentDatasources />
        </div>
      </div>
    </AppLayout>
  );
}
