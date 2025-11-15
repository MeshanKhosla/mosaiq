import type { Doc } from '../../../convex/_generated/dataModel';
import { AnalysisLink } from '~/components/analysis-link';

interface AnalysisLinksListProps {
  analyses: Array<Doc<'analyses'>> | undefined;
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
            <AnalysisLink
              key={analysis._id}
              analysisId={analysis._id}
              className="text-sm text-primary inline-flex items-center px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent transition-colors"
            >
              {analysis.name}
            </AnalysisLink>
          ))}
        </div>
      )}
    </div>
  );
}
