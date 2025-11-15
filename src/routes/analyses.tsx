import { useMemo, useState } from 'react';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
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
import { AppLayout } from '~/components/app-layout';
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

function AnalysisLink({
  analysisId,
  children,
}: {
  analysisId: Id<'analyses'>;
  children: React.ReactNode;
}) {
  const sheets = useQuery(api.sheets.getAllByAnalysis, { analysisId });
  const firstSheetId = sheets && sheets.length > 0 ? sheets[0]._id : null;

  if (firstSheetId) {
    return (
      <Link
        to="/analysis/$id/sheet/$sheetId"
        params={{ id: analysisId, sheetId: firstSheetId }}
        className="contents"
        preload="intent"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/analysis/$id"
      params={{ id: analysisId }}
      className="contents"
      preload="intent"
    >
      {children}
    </Link>
  );
}

export const Route = createFileRoute('/analyses')({
  component: AnalysesPage,
  beforeLoad: async () => {
    const { userId } = await fetchAuth();
    if (!userId) {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.analyses.list, {}),
    );
  },
});

type Analysis = {
  _id: Id<'analyses'>;
  _creationTime: number;
  name: string;
  datasourceIds: Array<Id<'datasources'>>;
};

function AnalysesPage() {
  const analyses = useQuery(api.analyses.list);
  const [sorting, setSorting] = useState<SortingState>([]);

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
    data: analyses || [],
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyses</h1>
          <p className="text-muted-foreground">View and manage your analyses</p>
        </div>

        <div className="rounded-md border">
          {!analyses ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:!bg-transparent">
                  <TableHead>
                    <Skeleton className="h-5 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-5 w-32" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-5 w-24" />
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
          ) : analyses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No analyses found. Create your first analysis from a datasource.
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
                    <AnalysisLink analysisId={row.original._id}>
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
          )}
        </div>
      </div>
    </AppLayout>
  );
}
