import * as React from 'react';
import { Loader2, Upload as UploadIcon, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

export function Upload() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.datasources.generateUploadUrl);
  const createDatasource = useMutation(api.datasources.create);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile || !name.trim()) {
      setError(selectedFile ? 'Please enter a name' : 'Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Get a short-lived upload URL
      const postUrl = await generateUploadUrl();

      // Step 2: POST the file to the URL
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': selectedFile.type || 'text/csv' },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error('Failed to upload file');
      }

      const { storageId } = await result.json();

      // Step 3: Save the newly allocated storage id to the database
      await createDatasource({
        storageId,
        name: name.trim(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      // Reset form
      setSelectedFile(null);
      setName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
