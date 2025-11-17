import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { authClient } from '~/lib/auth-client';
import { AppLayout } from '~/components/app-layout';
import { DashboardLink } from '~/components/dashboard-link';
import { useAuthGuard } from '~/hooks/use-auth-guard';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/dashboards')({
  loader: async (opts) => {
    if (typeof window === 'undefined') {
      return;
    }
    await opts.context.queryClient.ensureQueryData(
      convexQuery(api.dashboards.list, {}),
    );
  },
  component: DashboardsPage,
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
  const { data: session } = authClient.useSession();
  const { data: dashboards } = useSuspenseQuery(
    convexQuery(api.dashboards.list, {}),
  );
  const { isLoading, shouldRedirect, loadingContent } = useAuthGuard({
    title: 'Dashboards',
    description: 'View and manage your dashboards',
    data: dashboards,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: dashboards === 'Unauthenticated' ? [] : dashboards,
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

  if (isLoading || shouldRedirect) {
    return loadingContent;
  }

  if (dashboards.length === 0) {
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
            <div className="p-8 text-center text-muted-foreground">
              No dashboards found. Create your first dashboard from an analysis.
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
          <h1 className="text-3xl font-bold">Dashboards</h1>
          <p className="text-muted-foreground">
            View and manage your dashboards
          </p>
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
        </div>
      </div>
    </AppLayout>
  );
}
