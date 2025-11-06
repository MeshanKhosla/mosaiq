import { ChevronDown } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

interface ColumnVisibilityDropdownProps {
  tableInstance: Table<Record<string, string | number>>;
}

export function ColumnVisibilityDropdown({
  tableInstance,
}: ColumnVisibilityDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Columns <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-56"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-1 px-2 py-1">
          <DropdownMenuItem
            className="flex-1 justify-center px-2 py-1.5 text-xs"
            onSelect={(e) => {
              e.preventDefault();
              tableInstance
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .forEach((column) => {
                  column.toggleVisibility(true);
                });
            }}
          >
            Select All
          </DropdownMenuItem>
          <div className="h-4 w-px bg-border" />
          <DropdownMenuItem
            className="flex-1 justify-center px-2 py-1.5 text-xs"
            onSelect={(e) => {
              e.preventDefault();
              tableInstance
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .forEach((column) => {
                  column.toggleVisibility(false);
                });
            }}
          >
            Deselect All
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {tableInstance
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
