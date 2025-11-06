import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { AppLayout } from '~/components/app-layout';
import { Upload } from '~/components/upload';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { data: user } = useSuspenseQuery(
    convexQuery(api.auth.getCurrentUser, {}),
  );

  return (
    <AppLayout>
      <div className="space-y-6">{user && <Upload />}</div>
    </AppLayout>
  );
}
