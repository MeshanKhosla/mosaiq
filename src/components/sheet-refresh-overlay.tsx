import { Loader2 } from 'lucide-react';

export function SheetRefreshOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Gradient background layers */}
      <div
        className="absolute inset-0 -z-10 overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 20% 10%, hsl(var(--ring)) 0%, transparent 60%),
            radial-gradient(circle at 80% 15%, hsl(var(--chart-1)) 0%, transparent 60%),
            radial-gradient(circle at 50% 5%, hsl(var(--ring)) 0%, transparent 50%)
          `,
          opacity: 0.3,
          filter: 'blur(120px)',
        }}
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 150% 100% at top, hsl(var(--ring)) 0%, transparent 80%)
          `,
          opacity: 0.2,
          filter: 'blur(80px)',
        }}
      />

      {/* Loading content */}
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing sheet...</p>
      </div>
    </div>
  );
}

