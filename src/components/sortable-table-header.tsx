import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import { Button } from '~/components/ui/button';

interface SortableTableHeaderProps<T> {
  column: Column<T>;
  label: string;
}

/**
 * Reusable sortable table header component
 */
export function SortableTableHeader<T>({
  column,
  label,
}: SortableTableHeaderProps<T>) {
  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      className="h-8 px-2 w-full justify-start hover:bg-transparent"
      onClick={() => column.toggleSorting()}
    >
      {label}
      {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
      {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
    </Button>
  );
}
