import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';
import type { Id } from 'convex/_generated/dataModel';
import { AppLayout } from '~/components/app-layout';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async (opts) => {
    await opts.context.queryClient.prefetchQuery(
      convexQuery(api.numbers.list, {}),
    );
  },
});

function HomePage() {
  const { data: numbers } = useSuspenseQuery(convexQuery(api.numbers.list, {}));
  const { data: user } = useQuery(convexQuery(api.auth.getCurrentUser, {}));

  const createNumber = useMutation(api.numbers.create).withOptimisticUpdate(
    (localStore, args) => {
      const { value } = args;
      const existingNumbers = localStore.getQuery(api.numbers.list, {});

      if (existingNumbers !== undefined) {
        localStore.setQuery(api.numbers.list, {}, [
          ...existingNumbers,
          {
            _id: crypto.randomUUID() as Id<'numbers'>,
            _creationTime: Date.now(),
            value,
            createdBy: user?._id ?? '',
          },
        ]);
      }
    },
  );

  function createRandomNumber() {
    createNumber({ value: Math.floor(Math.random() * 10) + 1 });
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Mosaiq
          </h1>
          <p className="text-muted-foreground">
            {numbers.map((number) => number.value).join(', ')}
          </p>
          {user && <Button onClick={createRandomNumber}>Create Number</Button>}
        </div>
      </div>
    </AppLayout>
  );
}
