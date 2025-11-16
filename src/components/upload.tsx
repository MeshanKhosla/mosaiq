import { useRef, useState } from 'react';
import { Loader2, Upload as UploadIcon } from 'lucide-react';
import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { useUploadFile } from '@convex-dev/r2/react';
import { api } from '../../convex/_generated/api';
import type { ChangeEvent } from 'react';
import { Button } from '~/components/ui/button';
import { useDuckDbContext } from '~/components/duckdb-provider';
import { authClient } from '~/lib/auth-client';
import { parseCsvColumnTypesWithDuckDB } from '~/lib/csv-utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function Upload() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { db, loading: dbLoading, error: dbError } = useDuckDbContext();

  const uploadFile = useUploadFile(api.datasources);
  const createDatasource = useMutation(api.datasources.create);

  const handleFileInputClick = () => {
    if (!session) {
      navigate({ to: '/signin' });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!session) {
      navigate({ to: '/signin' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File size must be less than 5 MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      if (dbLoading) {
        setError(
          'DuckDB is still loading. Please wait a moment and try again.',
        );
        setIsUploading(false);
        return;
      }

      if (dbError || !db) {
        setError('Failed to initialize DuckDB. Please refresh the page.');
        setIsUploading(false);
        return;
      }

      const csvContent = await file.text();
      const columnTypes = await parseCsvColumnTypesWithDuckDB(db, csvContent);

      const columns = Object.entries(columnTypes).map(([name, type]) => ({
        _id: crypto.randomUUID(),
        name,
        type,
      }));

      // Upload file to R2 and get the storage key
      const storageKey = await uploadFile(file);

      const name = file.name.replace(/\.csv$/i, '');
      const datasourceId = await createDatasource({
        name,
        fileName: file.name,
        fileSize: file.size,
        storageKey,
        columns,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      navigate({
        to: '/datasource/$id',
        params: { id: datasourceId },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsUploading(false);
    }
  };

  return (
    <div className="relative pt-8 pb-8 min-h-[25vh]">
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

      <div className="w-full space-y-4 px-4">
        <div className="flex flex-col items-center space-y-4 w-full">
          <input
            id="file-upload"
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />

          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={isUploading || !session}
            onClick={handleFileInputClick}
            className="w-full h-20 text-lg cursor-pointer relative overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-md border-2 border-border/50 hover:border-ring/50 hover:bg-card/90 dark:hover:bg-card/70 transition-all"
            style={{
              boxShadow:
                '0 0 40px hsl(var(--ring) / 0.4), 0 0 80px hsl(var(--ring) / 0.2), 0 0 120px hsl(var(--ring) / 0.1)',
            }}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : !session ? (
              <>
                <UploadIcon className="mr-2 h-5 w-5" />
                Sign in to upload CSV
              </>
            ) : (
              <>
                <UploadIcon className="mr-2 h-5 w-5" />
                Choose CSV File
              </>
            )}
          </Button>

          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 w-full">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
