import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { FileText, Globe } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
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

export function RecentDatasources() {
  const { data: datasources } = useSuspenseQuery(
    convexQuery(api.datasources.list, {}),
  );

  if (datasources === 'Unauthenticated') {
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

  const recentDatasources = [...datasources]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Recent Datasources
        </h2>
        {datasources.length > 0 && (
          <Link
            to="/datasources"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        )}
      </div>
      {recentDatasources.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No datasources yet. Upload your first CSV file to get started.
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
                  <CardTitle className="text-lg flex items-center gap-2">
                    {(datasource.type ?? 'csv') === 'url' ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
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
  );
}
