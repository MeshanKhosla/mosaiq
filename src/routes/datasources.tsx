import { useMemo, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, FileText, Globe } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { AppLayout } from '~/components/app-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/datasources')({
  loader: async (opts) => {
    if (typeof window === 'undefined') {
      return;
    }
    await opts.context.queryClient.ensureQueryData(
      convexQuery(api.datasources.list, {}),
    );
  },
  component: DatasourcesPage,
});

type Datasource = {
  _id: Id<'datasources'>;
  _creationTime: number;
  name: string;
  fileName: string;
  fileSize: number;
  type?: 'csv' | 'url';
  sourceUrl?: string;
};

function DatasourcesPage() {
  const { data: session, isPending: isLoadingSession } =
    authClient.useSession();
  const navigate = useNavigate();
  const { data: datasources } = useSuspenseQuery(
    convexQuery(api.datasources.list, {}),
  );
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns = useMemo<Array<ColumnDef<Datasource>>>(
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
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            {(row.original.type ?? 'csv') === 'url' ? (
              <>
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">URL</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">CSV</span>
              </>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'fileName',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="h-8 px-2 w-full justify-start hover:bg-transparent"
              onClick={() => column.toggleSorting()}
            >
              File Name
              {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
              {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
            </Button>
          );
        },
        cell: ({ row }) => row.original.fileName,
      },
      {
        accessorKey: 'fileSize',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="h-8 px-2 w-full justify-start hover:bg-transparent"
              onClick={() => column.toggleSorting()}
            >
              Size
              {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
              {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
            </Button>
          );
        },
        cell: ({ row }) => formatFileSize(row.original.fileSize),
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
    ],
    [],
  );

  const table = useReactTable({
    data: datasources,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  if (isLoadingSession) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Datasources</h1>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    navigate({ to: '/' });
    return null;
  }

  if (datasources.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Datasources</h1>
            <p className="text-muted-foreground">
              View and manage your datasources
            </p>
          </div>

          <div className="rounded-md border">
            <div className="p-8 text-center text-muted-foreground">
              No datasources found. Upload your first datasource to get started.
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
          <h1 className="text-3xl font-bold tracking-tight">Datasources</h1>
          <p className="text-muted-foreground">
            View and manage your datasources
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
                  <Link
                    to="/datasource/$id"
                    params={{ id: row.original._id }}
                    className="contents"
                    preload="intent"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </Link>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
