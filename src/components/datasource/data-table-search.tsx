import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';

interface DataTableSearchProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function DataTableSearch({
  searchValue,
  onSearchChange,
  isExpanded,
  onExpand,
  onCollapse,
  searchInputRef,
}: DataTableSearchProps) {
  return (
    <div className="relative flex items-center">
      <button
        onClick={onExpand}
        className={`p-1.5 hover:bg-accent rounded-md transition-all duration-200 ${
          isExpanded
            ? 'opacity-0 w-0 pointer-events-none'
            : 'opacity-100 w-auto'
        }`}
        aria-label="Search rows"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>
      <div
        className={`relative flex items-center transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? 'opacity-100 w-[200px] ml-2' : 'opacity-0 w-0'
        }`}
      >
        <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={searchInputRef}
          placeholder="Search rows..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onBlur={() => {
            if (!searchValue) {
              onCollapse();
            }
          }}
          className="pl-8 pr-8 h-8 w-[200px]"
        />
        <button
          onClick={() => {
            onSearchChange('');
            onCollapse();
          }}
          className="absolute right-2 p-0.5 hover:bg-accent rounded-sm z-10"
          aria-label="Close search"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
