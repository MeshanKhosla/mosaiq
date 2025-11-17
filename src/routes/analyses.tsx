import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { AppLayout } from '~/components/app-layout';
import { AnalysisLink } from '~/components/analysis-link';
import { authClient } from '~/lib/auth-client';
import { DataTableSkeleton } from '~/components/data-table/skeleton';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/analyses')({
  loader: async (opts) => {
    if (typeof window === 'undefined') {
      // Only prefetch on the client (not during SSR)
      return;
    }
    await opts.context.queryClient.ensureQueryData(
      convexQuery(api.analyses.list, {}),
    );
  },
  component: AnalysesPage,
});

type Analysis = {
  _id: Id<'analyses'>;
  _creationTime: number;
  name: string;
  datasourceIds: Array<Id<'datasources'>>;
};

function AnalysesPage() {
  const { data: session, isPending: isLoadingSession } =
    authClient.useSession();
  const { data: analyses } = useSuspenseQuery(
    convexQuery(api.analyses.list, {}),
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const navigate = useNavigate();
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = useMemo<Array<ColumnDef<Analysis>>>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="h-8 px-2 w-full justify-start hover:bg-transparent"
              onClick={() => column.toggleSorting()}
            >
              Name
              {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
              {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: '_creationTime',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="h-8 px-2 w-full justify-start hover:bg-transparent"
              onClick={() => column.toggleSorting()}
            >
              Created
              {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
              {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
            </Button>
          );
        },
        cell: ({ row }) => formatDate(row.original._creationTime),
      },
      {
        accessorKey: 'datasourceIds',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="h-8 px-2 w-full justify-start hover:bg-transparent"
              onClick={() => column.toggleSorting()}
            >
              Datasources
              {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
              {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
            </Button>
          );
        },
        cell: ({ row }) => row.original.datasourceIds.length,
        accessorFn: (row) => row.datasourceIds.length,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: analyses === 'Unauthenticated' ? [] : analyses,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  if (isLoadingSession || analyses === 'Unauthenticated') {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analyses</h1>
            <p className="text-muted-foreground">
              View and manage your analyses
            </p>
          </div>

          <DataTableSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    navigate({ to: '/' });
    return null;
  }

  if (analyses.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analyses</h1>
            <p className="text-muted-foreground">
              View and manage your analyses
            </p>
          </div>

          <div className="rounded-md border">
            <div className="p-8 text-center text-muted-foreground">
              No analyses found. Create your first analysis from a datasource.
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyses</h1>
          <p className="text-muted-foreground">View and manage your analyses</p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:!bg-accent">
                  <AnalysisLink
                    analysisId={row.original._id}
                    className="contents"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </AnalysisLink>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
