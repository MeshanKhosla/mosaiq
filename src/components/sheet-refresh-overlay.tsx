import { useEffect, useState } from 'react';

export function SheetRefreshOverlay() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar from 0 to 100% over 450ms
    const startTime = Date.now();
    const duration = 450;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }, []);

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
      <div className="flex flex-col items-center gap-6 w-full max-w-md px-8">
        <div className="flex flex-col gap-2 w-full">
          <p className="text-sm font-medium text-foreground text-center">
            Loading DuckDB binary...
          </p>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-75 ease-out"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
