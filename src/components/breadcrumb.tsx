import { Link, useRouterState } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ChevronRight } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const routeMap: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/signin': 'Sign In',
  '/signup': 'Sign Up',
};

export function Breadcrumb() {
  const router = useRouterState();
  const pathname = router.location.pathname;

  // Extract datasource ID from pathname if on datasource page
  const datasourceIdMatch = pathname.match(/^\/datasource\/(.+)$/);
  const datasourceId = datasourceIdMatch
    ? (datasourceIdMatch[1] as Id<'datasources'>)
    : null;

  // Extract analysis ID from pathname if on analysis page
  const analysisIdMatch = pathname.match(/^\/analysis\/(.+)$/);
  const analysisId = analysisIdMatch
    ? (analysisIdMatch[1] as Id<'analyses'>)
    : null;

  // Fetch datasource if on datasource page
  const datasource = useQuery(
    api.datasources.get,
    datasourceId ? { id: datasourceId } : 'skip',
  );

  // Fetch analysis if on analysis page
  const analysis = useQuery(
    api.analyses.get,
    analysisId ? { id: analysisId } : 'skip',
  );

  // Fetch the first datasource for the analysis
  const analysisDatasourceId =
    analysis && analysis.datasourceIds.length > 0
      ? analysis.datasourceIds[0]
      : null;
  const analysisDatasource = useQuery(
    api.datasources.get,
    analysisDatasourceId ? { id: analysisDatasourceId } : 'skip',
  );

  // Helper to check if a string looks like an ID (Convex IDs are typically long alphanumeric strings)
  const looksLikeId = (str: string): boolean => {
    // Convex IDs are typically 27 characters long, alphanumeric
    // Check if it looks like an ID: long alphanumeric string
    return /^[a-zA-Z0-9]{20,}$/.test(str);
  };

  // Build breadcrumb items
  const breadcrumbItems: Array<{ label: string; path?: string }> = [
    { label: 'Home', path: '/' },
  ];

  if (pathname.startsWith('/analysis/')) {
    // Analysis page: Home > Datasources > Datasource name > Analysis Name
    // Only show if both analysis and datasource are loaded with names
    if (
      analysis &&
      analysisDatasource &&
      analysis.name &&
      analysisDatasource.name
    ) {
      breadcrumbItems.push({ label: 'Datasources', path: '/datasources' });
      breadcrumbItems.push({
        label: analysisDatasource.name,
        path: `/datasource/${analysisDatasourceId}`,
      });
      breadcrumbItems.push({ label: analysis.name });
    }
  } else if (pathname.startsWith('/datasource/')) {
    // Datasource page: Home > Datasource > Datasource name
    // Only show if datasource is loaded with a name
    if (datasource && datasource.name) {
      breadcrumbItems.push({ label: 'Datasources', path: '/datasources' });
      breadcrumbItems.push({ label: datasource.name });
    }
  } else if (routeMap[pathname] && pathname !== '/') {
    // Other mapped routes (skip if already on home page)
    breadcrumbItems.push({ label: routeMap[pathname] });
  } else if (pathname !== '/') {
    // Fallback for other routes - only show if it doesn't look like an ID
    const lastSegment = pathname.split('/').pop();
    if (lastSegment && lastSegment.length > 0 && !looksLikeId(lastSegment)) {
      breadcrumbItems.push({
        label: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1),
      });
    }
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
          {item.path ? (
            <Link
              to={item.path}
              className="text-muted-foreground hover:text-accent-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-accent-foreground font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
