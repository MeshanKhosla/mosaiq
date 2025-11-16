import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useDuckDbQuery } from 'duckdb-wasm-kit';
import { Filter, Plus, X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Input } from '~/components/ui/input';
import { escapeColumnName, escapeTableName } from '~/lib/sql-utils';

type Column = Doc<'datasources'>['columns'][number];

interface FiltersProps {
  sheetId: Id<'sheets'>;
  columns: Array<Column>;
  tableName?: string;
  tableLoaded: boolean;
}

export function Filters({
  sheetId,
  columns,
  tableName,
  tableLoaded,
}: FiltersProps) {
  const sheet = useQuery(api.sheets.get, { id: sheetId });
  const updateFilters = useMutation(
    api.sheets.updateFilters,
  ).withOptimisticUpdate((localStore, args) => {
    const existingSheet = localStore.getQuery(api.sheets.get, {
      id: args.sheetId,
    });

    if (existingSheet !== undefined && existingSheet !== null) {
      localStore.setQuery(
        api.sheets.get,
        { id: args.sheetId },
        {
          ...existingSheet,
          filters: args.filters.length > 0 ? args.filters : undefined,
        },
      );
    }
  });

  const filters = sheet?.filters || [];
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedColumn = columns.find((col) => col._id === selectedColumnId);

  const distinctValuesQuery = useMemo(() => {
    if (!selectedColumn || !tableName || !tableLoaded) {
      return '';
    }
    const columnName = escapeColumnName(selectedColumn.name);
    const escapedTableName = escapeTableName(tableName);
    return `SELECT DISTINCT ${columnName} as value FROM ${escapedTableName} ORDER BY ${columnName}`;
  }, [selectedColumn, tableName, tableLoaded]);

  const { arrow: distinctValuesArrow, loading: distinctValuesLoading } =
    useDuckDbQuery(distinctValuesQuery);

  const distinctValues = useMemo(() => {
    if (!distinctValuesArrow) {
      return [];
    }
    const values: Array<string | number> = [];
    try {
      const data = distinctValuesArrow.toArray();
      for (const row of data) {
        const value = row.value;
        if (value !== null && value !== undefined) {
          values.push(value);
        }
      }
    } catch (e) {
      console.error('Error parsing distinct values:', e);
    }
    return values;
  }, [distinctValuesArrow]);

  const filteredValues = useMemo(() => {
    if (!searchValue.trim()) {
      return distinctValues;
    }
    const searchLower = searchValue.toLowerCase();
    return distinctValues.filter((val) =>
      String(val).toLowerCase().includes(searchLower),
    );
  }, [distinctValues, searchValue]);

  const currentFilter = filters.find((f) => f.columnId === selectedColumnId);
  const selectedValues = currentFilter?.selectedValues || [];

  const handleToggleValue = (value: string | number, checked: boolean) => {
    if (!selectedColumnId) return;

    const otherFilters = filters.filter((f) => f.columnId !== selectedColumnId);

    // When no filter exists, all values are implicitly selected
    if (!currentFilter) {
      if (checked) {
        return;
      } else {
        // Create filter with all values except the unchecked one
        const newSelectedValues = distinctValues.filter((v) => v !== value);
        if (newSelectedValues.length > 0) {
          const newFilters = [
            ...otherFilters,
            { columnId: selectedColumnId, selectedValues: newSelectedValues },
          ];
          updateFilters({ sheetId, filters: newFilters });
        }
        return;
      }
    }

    const newSelectedValues = checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value);

    // Remove filter entirely if all values would be selected
    const newFilters =
      newSelectedValues.length > 0
        ? [
            ...otherFilters,
            { columnId: selectedColumnId, selectedValues: newSelectedValues },
          ]
        : otherFilters;

    updateFilters({ sheetId, filters: newFilters });
  };

  const handleRemoveFilter = (columnId: string) => {
    const newFilters = filters.filter((f) => f.columnId !== columnId);
    updateFilters({ sheetId, filters: newFilters });
  };

  const handleAddFilter = () => {
    setIsPopoverOpen(true);
  };

  const handleColumnSelect = (columnId: string) => {
    setSelectedColumnId(columnId);
    setSearchValue('');
  };

  const handlePopoverClose = (open: boolean) => {
    setIsPopoverOpen(open);
    if (!open) {
      setSelectedColumnId('');
      setSearchValue('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {filters.map((filter) => {
          const column = columns.find((col) => col._id === filter.columnId);
          if (!column) return null;
          return (
            <span
              key={filter.columnId}
              className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs shrink-0 cursor-pointer hover:bg-primary/20"
              onClick={() => {
                setSelectedColumnId(filter.columnId);
                setIsPopoverOpen(true);
              }}
            >
              <Filter className="h-3 w-3" />
              {column.name}
              {filter.selectedValues.length > 0 && (
                <span className="text-muted-foreground">
                  ({filter.selectedValues.length})
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFilter(filter.columnId);
                }}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <Popover open={isPopoverOpen} onOpenChange={handlePopoverClose}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 border border-dashed text-xs px-2"
              onClick={handleAddFilter}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="w-80 p-3"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Select Column
                </label>
                <Select
                  value={selectedColumnId}
                  onValueChange={handleColumnSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => {
                      const hasFilter = filters.some(
                        (f) => f.columnId === col._id,
                      );
                      return (
                        <SelectItem key={col._id} value={col._id}>
                          {col.name}
                          {hasFilter && ' (filtered)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedColumn && (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">
                      Filter Values
                    </label>
                    <Input
                      placeholder="Search values..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  {distinctValuesLoading ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      Loading values...
                    </div>
                  ) : filteredValues.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      {searchValue ? 'No matching values' : 'No values found'}
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-auto space-y-1 border rounded-md p-2">
                      {filteredValues.map((value, index) => {
                        const isSelected = currentFilter
                          ? selectedValues.includes(value)
                          : true;
                        return (
                          <label
                            key={`${value}-${index}`}
                            htmlFor={`filter-value-${index}`}
                            className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                          >
                            <Checkbox
                              id={`filter-value-${index}`}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleToggleValue(value, checked === true)
                              }
                            />
                            <span className="text-sm font-normal flex-1">
                              {String(value)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
