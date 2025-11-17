import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { authClient } from '~/lib/auth-client';
import { AppLayout } from '~/components/app-layout';
import { DataTableSkeleton } from '~/components/data-table/skeleton';

interface UseAuthGuardOptions {
  title: string;
  description: string;
  data?: unknown;
  loadingSkeleton?: ReactNode;
}

interface UseAuthGuardResult {
  isLoading: boolean;
  shouldRedirect: boolean;
  loadingContent: ReactNode | null;
}

export function useAuthGuard({
  title,
  description,
  data,
  loadingSkeleton,
}: UseAuthGuardOptions): UseAuthGuardResult {
  const { data: session, isPending: isLoadingSession } =
    authClient.useSession();
  const navigate = useNavigate();

  const defaultSkeleton = (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {loadingSkeleton ?? <DataTableSkeleton />}
      </div>
    </AppLayout>
  );

  if (isLoadingSession) {
    return {
      isLoading: true,
      shouldRedirect: false,
      loadingContent: defaultSkeleton,
    };
  }

  if (!session) {
    navigate({ to: '/' });
    return {
      isLoading: false,
      shouldRedirect: true,
      loadingContent: null,
    };
  }

  if (data === 'Unauthenticated') {
    return {
      isLoading: true,
      shouldRedirect: false,
      loadingContent: defaultSkeleton,
    };
  }

  return {
    isLoading: false,
    shouldRedirect: false,
    loadingContent: null,
  };
}
