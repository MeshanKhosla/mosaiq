import { useRef, useState } from 'react';
import { Dice1, Globe, Loader2, Upload as UploadIcon } from 'lucide-react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { useUploadFile } from '@convex-dev/r2/react';
import { CheckoutDialog, useCustomer } from 'autumn-js/react';
import { api } from '../../convex/_generated/api';
import type { ChangeEvent } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { useDuckDbContext } from '~/components/duckdb-provider';
import { authClient } from '~/lib/auth-client';
import { parseCsvColumnTypesWithDuckDB } from '~/lib/csv-utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type UploadMode = 'csv' | 'url';

const EXAMPLE_URLS = [
  'https://tanstack.com/maintainers',
  'https://www.imdb.com/chart/top/?genres=sci-fi',
];
export function Upload() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('csv');
  const [url, setUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(false);
  const [lastRandomUrl, setLastRandomUrl] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { db, loading: dbLoading, error: dbError } = useDuckDbContext();
  const limitInfo = useQuery(
    api.datasources.checkDatasourceLimit,
    session ? {} : 'skip',
  );
  const { checkout } = useCustomer();
  const syncSubscription = useAction(api.datasources.syncSubscriptionStatus);

  const validateUrl = (urlString: string): boolean => {
    if (!urlString.trim()) {
      return false;
    }

    const trimmedUrl = urlString.trim();

    // Basic format check - must start with http:// or https://
    if (!trimmedUrl.match(/^https?:\/\//i)) {
      return false;
    }

    try {
      const urlObj = new URL(trimmedUrl);

      // Check if it's http or https
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }

      // Check if hostname exists and is valid
      if (!urlObj.hostname || urlObj.hostname.length < 4) {
        return false;
      }

      // Check if hostname has at least one dot (for TLD)
      const hostname = urlObj.hostname.toLowerCase();
      if (!hostname.includes('.')) {
        return false;
      }

      // Check if domain has valid structure (at least domain.tld)
      const parts = hostname.split('.');
      // Must have at least 2 parts (domain.tld) and last part should be at least 2 chars
      if (parts.length < 2 || parts[parts.length - 1].length < 2) {
        return false;
      }

      // Each part should not be empty
      if (parts.some((part) => part.length === 0)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  const uploadFile = useUploadFile(api.datasources);
  const createDatasource = useMutation(api.datasources.create);
  const scrapeUrl = useAction(api.datasources.scrapeUrlForUpload);

  const handleFileInputClick = () => {
    if (!session) {
      navigate({ to: '/signin' });
      return;
    }

    if (limitInfo && !limitInfo.allowed) {
      setError(
        `You've reached your datasource limit (${limitInfo.limit}). Upgrade to Pro to unlock more.`,
      );
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

    if (limitInfo && !limitInfo.allowed) {
      setError(
        `You've reached your datasource limit (${limitInfo.limit}). Upgrade to Pro to unlock more.`,
      );
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

  const handleUrlScrape = async () => {
    if (!session) {
      navigate({ to: '/signin' });
      return;
    }

    if (limitInfo && !limitInfo.allowed) {
      setError(
        `You've reached your datasource limit (${limitInfo.limit}). Upgrade to Pro to unlock more.`,
      );
      return;
    }

    if (!isUrlValid) {
      setError('Please enter a valid URL');
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

      // Scrape URL using Firecrawl
      const { csvContent } = await scrapeUrl({ url: url.trim() });

      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('No data could be extracted from the URL');
      }

      // Process CSV with DuckDB to get column types
      const columnTypes = await parseCsvColumnTypesWithDuckDB(db, csvContent);

      const columns = Object.entries(columnTypes).map(([name, type]) => ({
        _id: crypto.randomUUID(),
        name,
        type,
      }));

      // Create a File object from CSV content
      const fileName = `scraped-${Date.now()}.csv`;
      const file = new File([csvContent], fileName, { type: 'text/csv' });

      // Upload file to R2 and get the storage key
      const storageKey = await uploadFile(file);

      // Extract a name from URL (site name + date)
      const urlObj = new URL(url.trim());
      // Remove www. and get the main domain (e.g., "en.wikipedia.org" -> "wikipedia")
      const hostname = urlObj.hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      // If there are 3+ parts (e.g., "en.wikipedia.org"), use the middle one
      // Otherwise use the first part (e.g., "example.com" -> "example")
      const siteName = parts.length >= 3 ? parts[parts.length - 2] : parts[0];
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const name = `${siteName}_${date}`;

      const datasourceId = await createDatasource({
        name,
        fileName,
        fileSize: file.size,
        storageKey,
        columns,
        type: 'url',
        sourceUrl: url.trim(),
      });

      setUrl('');
      navigate({
        to: '/datasource/$id',
        params: { id: datasourceId },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to scrape URL. Please try again.',
      );
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && uploadMode === 'url' && !isUploading) {
      handleUrlScrape();
    }
  };

  const handleRandomUrl = () => {
    // Filter out the last selected URL to avoid selecting the same one twice in a row
    const availableUrls =
      EXAMPLE_URLS.length > 1 && lastRandomUrl
        ? EXAMPLE_URLS.filter((u) => u !== lastRandomUrl)
        : EXAMPLE_URLS;

    const randomUrl =
      availableUrls[Math.floor(Math.random() * availableUrls.length)];
    setUrl(randomUrl);
    setLastRandomUrl(randomUrl);
    setIsUrlValid(true);
    setError(null);
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
          {/* Mode Toggle */}
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant={uploadMode === 'csv' ? 'default' : 'outline'}
              onClick={() => {
                setUploadMode('csv');
                setError(null);
              }}
              disabled={isUploading}
              className="flex-1"
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <Button
              type="button"
              variant={uploadMode === 'url' ? 'default' : 'outline'}
              onClick={() => {
                setUploadMode('url');
                setError(null);
                setIsUrlValid(false);
                setUrl('');
                setLastRandomUrl(null);
              }}
              disabled={isUploading}
              className="flex-1"
            >
              <Globe className="mr-2 h-4 w-4" />
              Scrape URL
            </Button>
          </div>

          {uploadMode === 'csv' ? (
            <>
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
            </>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex gap-2 items-center relative">
                <div className="flex-1 relative">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setUrl(newUrl);
                      setIsUrlValid(validateUrl(newUrl));
                      setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="https://example.com"
                    disabled={isUploading || !session}
                    className="w-full pr-10 relative overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-md border-2 border-border/50 hover:border-ring/50 focus-visible:border-ring/50 transition-all"
                    style={{
                      boxShadow: isUrlValid
                        ? '0 0 20px hsl(180 100% 50% / 0.3), 0 0 40px hsl(180 100% 50% / 0.2), 0 0 60px hsl(180 100% 50% / 0.1)'
                        : undefined,
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRandomUrl}
                    disabled={isUploading || !session}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-accent/50"
                    title="Try a random URL"
                  >
                    <Dice1 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading || !session || !isUrlValid}
                  onClick={handleUrlScrape}
                  className="shrink-0 relative overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-md border-2 border-border/50 hover:border-ring/50 hover:bg-card/90 dark:hover:bg-card/70 text-foreground transition-all"
                  style={{
                    boxShadow: isUrlValid
                      ? '0 0 20px hsl(180 100% 50% / 0.4), 0 0 40px hsl(180 100% 50% / 0.2), 0 0 60px hsl(180 100% 50% / 0.1)'
                      : undefined,
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Scrape
                    </>
                  )}
                </Button>
              </div>
              {!session && (
                <p className="text-sm text-muted-foreground text-center">
                  Sign in to scrape URLs
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/20 dark:bg-destructive/30 p-4 text-sm text-destructive dark:text-red-400 border-2 border-destructive/40 dark:border-destructive/60 w-full space-y-3">
              <p className="font-medium">{error}</p>
              {error.includes("You've reached your datasource limit") && (
                <Button
                  onClick={() => setShowUpgradeDialog(true)}
                  className="w-full"
                >
                  Upgrade to Pro (Free!)
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Upgrade to Pro (Free!) to unlock up to 50 datasources (currently
              limited to 20). This upgrade is free.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setShowUpgradeDialog(false);
                try {
                  await checkout({
                    productId: 'pro',
                    dialog: CheckoutDialog,
                  });
                  await syncSubscription();
                  window.location.reload();
                } catch (err) {
                  console.error('Checkout failed:', err);
                }
              }}
            >
              Continue to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
