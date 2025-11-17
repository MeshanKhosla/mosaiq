import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';
import { AnalysisLink } from '~/components/analysis-link';
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

export function RecentAnalyses() {
  const { data: analyses } = useSuspenseQuery(
    convexQuery(api.analyses.list, {}),
  );

  if (analyses === 'Unauthenticated') {
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

  const recentAnalyses = [...analyses]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Recent Analyses
        </h2>
        {analyses.length > 0 && (
          <Link
            to="/analyses"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        )}
      </div>
      {recentAnalyses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No analyses yet. Create your first analysis from a datasource.
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
                  <CardTitle className="text-lg">{analysis.name}</CardTitle>
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
  );
}
