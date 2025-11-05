import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../convex/_generated/api';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { ChangeEvent } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

export function Upload() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDatasource = useMutation(api.datasources.create);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size
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
      // Read CSV content
      const csvContent = await file.text();

      // Generate name from filename (remove .csv extension)
      const name = file.name.replace(/\.csv$/i, '');

      // Parse and store datasource
      const datasourceId = await createDatasource({
        name,
        fileName: file.name,
        fileSize: file.size,
        csvContent,
      });

      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Redirect to datasource page
      await navigate({ to: '/datasource/$id', params: { id: datasourceId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">CSV File</Label>
        <Input
          id="file"
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileSelect}
          disabled={isUploading}
          className="flex-1"
        />
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading and processing...
          </div>
        )}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
