import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import type { Id } from '../../../convex/_generated/dataModel';
import type { ColumnType } from './utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ColumnHeaderProps {
  column: Column<Record<string, string | number>, unknown>;
  columnName: string;
  columnType: ColumnType;
  datasourceId: Id<'datasources'>;
  updateColumnType: (args: {
    datasourceId: Id<'datasources'>;
    columnName: string;
    columnType: ColumnType;
  }) => void;
}

export function ColumnHeader({
  column,
  columnName,
  columnType,
  datasourceId,
  updateColumnType,
}: ColumnHeaderProps) {
  const isSorted = column.getIsSorted();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-2 lg:px-3 w-full justify-start"
        >
          <span className="flex-1 text-left">
            {columnName}{' '}
            <span className="text-xs text-muted-foreground">
              ({columnType})
            </span>
          </span>
          {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
          {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => column.toggleSorting(false)}
          disabled={isSorted === 'asc'}
        >
          <ArrowUp className="mr-2 h-4 w-4" />
          Sort Ascending
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => column.toggleSorting(true)}
          disabled={isSorted === 'desc'}
        >
          <ArrowDown className="mr-2 h-4 w-4" />
          Sort Descending
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Change Type</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => {
                updateColumnType({
                  datasourceId,
                  columnName,
                  columnType: 'string',
                });
              }}
              disabled={columnType === 'string'}
            >
              String
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                updateColumnType({
                  datasourceId,
                  columnName,
                  columnType: 'number',
                });
              }}
              disabled={columnType === 'number'}
            >
              Number
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                updateColumnType({
                  datasourceId,
                  columnName,
                  columnType: 'date',
                });
              }}
              disabled={columnType === 'date'}
            >
              Date
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
