import type { Doc } from '../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';

interface DatasourceHeaderProps {
  datasource: Doc<'datasources'> | null | undefined;
  isEditing: boolean;
  editName: string;
  hasFocusedRef: React.MutableRefObject<boolean>;
  onEditClick: () => void;
  onNameChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onUseInAnalysis: () => void;
  isCreatingAnalysis: boolean;
}

export function DatasourceHeader({
  datasource,
  isEditing,
  editName,
  hasFocusedRef,
  onEditClick,
  onNameChange,
  onBlur,
  onKeyDown,
  onUseInAnalysis,
  isCreatingAnalysis,
}: DatasourceHeaderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        {datasource ? (
          <>
            {isEditing ? (
              <input
                ref={(el) => {
                  if (el && !hasFocusedRef.current) {
                    hasFocusedRef.current = true;
                    el.focus();
                    el.select();
                  }
                }}
                type="text"
                value={editName}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                className="text-3xl font-bold tracking-tight outline-none bg-transparent border-none p-0 m-0 w-auto min-w-[200px]"
                style={{
                  width: `${Math.max(200, editName.length * 18)}px`,
                }}
              />
            ) : (
              <h1
                className="text-3xl font-bold tracking-tight cursor-pointer underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-muted-foreground/60"
                onClick={onEditClick}
              >
                {datasource.name}
              </h1>
            )}
          </>
        ) : (
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
        )}
        <Button
          onClick={onUseInAnalysis}
          disabled={isCreatingAnalysis || !datasource}
          className="bg-[hsl(var(--ring))] text-white hover:bg-[hsl(var(--ring))]/90 self-center"
        >
          {isCreatingAnalysis ? 'Creating...' : 'Use in analysis'}
        </Button>
      </div>
      {datasource ? (
        <p className="text-muted-foreground mt-2">{datasource.fileName}</p>
      ) : (
        <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
      )}
    </div>
  );
}
