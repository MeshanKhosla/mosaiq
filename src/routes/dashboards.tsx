import { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useQuery } from 'convex/react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { authClient } from '~/lib/auth-client';
import { AppLayout } from '~/components/app-layout';
import { DashboardLink } from '~/components/dashboard-link';
import { fetchAuth } from '~/routes/__root';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/dashboards')({
  component: DashboardsPage,
  beforeLoad: async () => {
    const { userId } = await fetchAuth();
    if (!userId) {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.dashboards.list, {}),
    );
  },
});

type Dashboard = {
  _id: Id<'dashboards'>;
  _creationTime: number;
  name: string;
  sourceAnalysisId: Id<'analyses'>;
  createdBy: string;
};

const columns: Array<ColumnDef<Dashboard>> = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
          className="h-8 px-2 -ml-2 hover:bg-transparent"
        >
          <span>Name</span>
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'createdBy',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
          className="h-8 px-2 -ml-2 hover:bg-transparent"
        >
          <span>Author</span>
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      );
    },
    cell: ({ table }) => {
      const meta = table.options.meta as
        | {
            currentUser?: { name?: string; email?: string };
          }
        | undefined;
      const currentUser = meta?.currentUser;

      if (currentUser) {
        return (
          <div className="text-muted-foreground">
            {currentUser.name || currentUser.email || 'User'}
          </div>
        );
      }

      return <div className="text-muted-foreground">User</div>;
    },
  },
  {
    accessorKey: '_creationTime',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
          className="h-8 px-2 -ml-2 hover:bg-transparent"
        >
          <span>Created</span>
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('_creationTime'));
      return (
        <div className="text-muted-foreground">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </div>
      );
    },
  },
];

function DashboardsPage() {
  const dashboards = useQuery(api.dashboards.list);
  const { data: session } = authClient.useSession();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: dashboards || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    meta: {
      currentUser: session?.user || undefined,
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboards</h1>
          <p className="text-muted-foreground">
            View and manage your dashboards
          </p>
        </div>
        <div className="rounded-md border">
          {!dashboards ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:!bg-transparent">
                  <TableHead>
                    <Skeleton className="h-5 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-5 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-5 w-32" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="hover:!bg-transparent">
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : dashboards.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No dashboards found. Create your first dashboard from an analysis.
            </div>
          ) : (
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
                    <DashboardLink
                      dashboardId={row.original._id}
                      sourceAnalysisId={row.original.sourceAnalysisId}
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
                    </DashboardLink>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
