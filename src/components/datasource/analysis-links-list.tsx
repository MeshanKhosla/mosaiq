import { Link } from '@tanstack/react-router';
import type { Doc } from '../../../convex/_generated/dataModel';

interface AnalysisLinksListProps {
  analyses: Doc<'analyses'>[] | undefined;
}

export function AnalysisLinksList({ analyses }: AnalysisLinksListProps) {
  if (analyses === undefined) {
    return null;
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-muted-foreground mb-2">
        Used in analyses
      </p>
      {analyses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not used in any analyses yet
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {analyses.map((analysis) => (
            <Link
              key={analysis._id}
              to="/analysis/$id"
              params={{ id: analysis._id }}
              className="text-sm text-primary inline-flex items-center px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent transition-colors"
            >
              {analysis.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
