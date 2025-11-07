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

interface BreadcrumbCTAButton {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
}

interface BreadcrumbProps {
  // Editing props for datasource name (only used on datasource page)
  isEditing?: boolean;
  editName?: string;
  hasFocusedRef?: React.MutableRefObject<boolean>;
  onEditClick?: () => void;
  onNameChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  // CTA buttons to display on the right side of the breadcrumb
  ctaButtons?: Array<BreadcrumbCTAButton>;
}

export function Breadcrumb({
  isEditing = false,
  editName = '',
  hasFocusedRef,
  onEditClick,
  onNameChange,
  onKeyDown,
  onBlur,
  ctaButtons = [],
}: BreadcrumbProps = {}) {
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
  const breadcrumbItems: Array<{
    label: string;
    path?: string;
    isEditable?: boolean;
  }> = [{ label: 'Home', path: '/' }];

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
      breadcrumbItems.push({ label: datasource.name, isEditable: true });
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
    <div className="flex items-center justify-between flex-1 gap-4">
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbItems.map((item, index) => {
          const isLastItem = index === breadcrumbItems.length - 1;
          const isEditableItem =
            item.isEditable &&
            isLastItem &&
            pathname.startsWith('/datasource/');

          return (
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
              ) : isEditableItem && onEditClick ? (
                isEditing ? (
                  <input
                    ref={(el) => {
                      if (el && hasFocusedRef && !hasFocusedRef.current) {
                        hasFocusedRef.current = true;
                        el.focus();
                        el.select();
                      }
                    }}
                    type="text"
                    value={editName}
                    onChange={(e) => onNameChange?.(e.target.value)}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    className="text-accent-foreground font-medium outline-none bg-transparent border-none p-0 m-0 w-auto min-w-[100px]"
                    style={{
                      width: `${Math.max(100, (editName.length || 10) * 8)}px`,
                    }}
                  />
                ) : (
                  <span
                    className="text-accent-foreground font-medium cursor-pointer underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-muted-foreground/60"
                    onClick={onEditClick}
                  >
                    {item.label}
                  </span>
                )
              ) : (
                <span className="text-accent-foreground font-medium">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
      {ctaButtons.length > 0 && (
        <div className="flex items-center gap-2">
          {ctaButtons.map((button, index) => {
            const isOutlined = button.variant === 'outline';
            const buttonClassName = isOutlined
              ? 'px-3 py-1 text-sm font-medium rounded-md border border-[hsl(var(--ring))] bg-background text-[hsl(var(--ring))] shadow-sm hover:bg-[hsl(var(--ring))]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              : 'px-3 py-1 text-sm font-medium rounded-md bg-[hsl(var(--ring))] text-white hover:bg-[hsl(var(--ring))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

            return (
              <button
                key={index}
                onClick={button.onClick}
                disabled={button.disabled}
                className={buttonClassName}
              >
                {button.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
