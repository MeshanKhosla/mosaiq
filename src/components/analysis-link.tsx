import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface AnalysisLinkProps {
  analysisId: Id<'analyses'>;
  children: React.ReactNode;
  className?: string;
  preload?: 'intent' | false;
}

export function AnalysisLink({
  analysisId,
  children,
  className,
  preload = 'intent',
}: AnalysisLinkProps) {
  const sheets = useQuery(api.sheets.getAllByAnalysis, { analysisId });
  const firstSheetId = sheets && sheets.length > 0 ? sheets[0]._id : null;

  if (firstSheetId) {
    return (
      <Link
        to="/analysis/$id/sheet/$sheetId"
        params={{ id: analysisId, sheetId: firstSheetId }}
        className={className}
        preload={preload}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/analysis/$id"
      params={{ id: analysisId }}
      className={className}
      preload={preload}
    >
      {children}
    </Link>
  );
}
