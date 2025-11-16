'use node';

import { v } from 'convex/values';
import FirecrawlApp from '@mendable/firecrawl-js';
import { action } from './_generated/server';

function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  // If data is an array, convert directly
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach((key) => allKeys.add(key));
      }
    }

    const headers = Array.from(allKeys);
    if (headers.length === 0) {
      return '';
    }

    // Create CSV rows
    const rows = [headers.join(',')];
    for (const item of data) {
      const values = headers.map((header) => {
        const value = item?.[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in values
        const stringValue = String(value).replace(/"/g, '""');
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue}"`;
        }
        return stringValue;
      });
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  // If data is a single object, try to extract tables or convert to single row
  if (typeof data === 'object') {
    // Check if it has a 'markdown' field (common in Firecrawl responses)
    if (data.markdown) {
      // Try to parse markdown tables
      const markdown = data.markdown;
      const tableRegex = /^\|(.+)\|\s*\n\|[-\s|:]+\|\s*\n((?:\|.+\|\s*\n?)+)/gm;
      const tables: Array<string> = [];

      let match;
      while ((match = tableRegex.exec(markdown)) !== null) {
        const headerRow = match[1].trim();
        const dataRows = match[2].trim().split('\n');

        const headers = headerRow
          .split('|')
          .map((h) => h.trim())
          .filter((h) => h.length > 0);

        if (headers.length > 0) {
          const csvRows = [headers.join(',')];
          for (const row of dataRows) {
            const cells = row
              .split('|')
              .map((c) => c.trim())
              .filter((c) => c.length > 0)
              .slice(0, headers.length);
            if (cells.length > 0) {
              const escapedCells = cells.map((cell) => {
                const escaped = cell.replace(/"/g, '""');
                if (
                  escaped.includes(',') ||
                  escaped.includes('"') ||
                  escaped.includes('\n')
                ) {
                  return `"${escaped}"`;
                }
                return escaped;
              });
              csvRows.push(escapedCells.join(','));
            }
          }
          tables.push(csvRows.join('\n'));
        }
      }

      if (tables.length > 0) {
        return tables[0]; // Return first table found
      }
    }

    // If no tables found, convert object to single-row CSV
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return '';
    }

    const headers = keys;
    const values = headers.map((key) => {
      const value = data[key];
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value).replace(/"/g, '""');
      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue}"`;
      }
      return stringValue;
    });

    return [headers.join(','), values.join(',')].join('\n');
  }

  return '';
}

export const scrapeUrl = action({
  args: {
    url: v.string(),
  },
  returns: v.string(),
  handler: async (_ctx, args) => {
    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    const app = new FirecrawlApp({ apiKey });

    try {
      // Scrape the URL using Firecrawl v2 API
      const result = await app.scrape(args.url, {
        formats: ['markdown', 'html'],
      });

      if (!result.markdown) {
        throw new Error('No data returned from Firecrawl');
      }

      // Try to extract structured data
      let csvContent = '';

      // First, try to extract from markdown (we know it exists from check above)
      // Try to parse markdown tables
      csvContent = convertToCSV({ markdown: result.markdown });

      // If no CSV generated from markdown, try to extract from HTML
      if (!csvContent && result.html) {
        // For now, we'll use a simple approach: extract text and create a basic CSV
        // In a production app, you might want to use a more sophisticated HTML parser
        const textContent = result.html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (textContent) {
          // Create a simple CSV with the text content
          csvContent = `Content\n"${textContent.replace(/"/g, '""')}"`;
        }
      }

      // If still no content, try to use the raw data
      if (!csvContent) {
        csvContent = convertToCSV(result);
      }

      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('Could not extract structured data from the URL');
      }

      return csvContent;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to scrape URL: ${error.message}`);
      }
      throw new Error('Failed to scrape URL: Unknown error');
    }
  },
});
