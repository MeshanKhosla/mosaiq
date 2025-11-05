import { useRef, useState } from 'react';
import { Loader2, Upload as UploadIcon, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../convex/_generated/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { ChangeEvent, FormEvent } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

export function Upload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDatasource = useMutation(api.datasources.create);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      setSelectedFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File size must be less than 5 MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      );
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    // Auto-populate name from filename (remove .csv extension)
    setName(file.name.replace(/\.csv$/i, ''));
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedFile || !name.trim()) {
      setError(selectedFile ? 'Please enter a name' : 'Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Read CSV content
      const csvContent = await selectedFile.text();

      // Parse and store datasource
      const datasourceId = await createDatasource({
        name: name.trim(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        csvContent,
      });

      // Reset form
      setSelectedFile(null);
      setName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Redirect to datasource page
      await navigate({ to: '/datasource/$id', params: { id: datasourceId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <form onSubmit={handleUpload} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">CSV File</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isUploading}
              className="flex-1"
            />
            {selectedFile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {selectedFile.name} (
              {(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="space-y-2">
            <Label htmlFor="name">Datasource Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for this datasource"
              disabled={isUploading}
              required
            />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={!selectedFile || !name.trim() || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadIcon className="h-4 w-4" />
              Upload CSV
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
