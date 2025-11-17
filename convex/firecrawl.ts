'use node';

import { v } from 'convex/values';
import { FirecrawlClient } from '@mendable/firecrawl-js';
import { action } from './_generated/server';

function normalizeNumericValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  const stringValue = String(value).trim();
  if (stringValue === '') {
    return '';
  }

  const numericPatternWithCommas = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
  if (numericPatternWithCommas.test(stringValue)) {
    return stringValue.replace(/,/g, '');
  }

  return stringValue;
}

function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '';
    }

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

    const rows = [headers.join(',')];
    for (const item of data) {
      const values = headers.map((header) => {
        const value = item?.[header];
        const normalizedValue = normalizeNumericValue(value);
        if (normalizedValue === '') {
          return '';
        }
        const stringValue = normalizedValue.replace(/"/g, '""');
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

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return '';
    }

    const headers = keys;
    const values = headers.map((key) => {
      const value = data[key];
      const normalizedValue = normalizeNumericValue(value);
      if (normalizedValue === '') {
        return '';
      }
      const stringValue = normalizedValue.replace(/"/g, '""');
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
    try {
      new URL(args.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    const app = new FirecrawlClient({
      apiKey,
      timeoutMs: 180000,
    });

    try {
      const result = await app.scrape(args.url, {
        timeout: 120000,
        formats: [
          {
            type: 'json',
            schema: {
              type: 'object',
              required: [],
              properties: {},
            },
            prompt:
              'Extract all tabular data and structured information from this page. Return the data as an array of objects where each object represents a row, with keys as column names. If there are multiple tables, combine them into a single array. If the page contains non-tabular data, structure it as an array with a single object containing key-value pairs.',
          },
        ],
      });

      if (!result.json) {
        throw new Error('No JSON data returned from Firecrawl');
      }

      const csvContent = convertToCSV(result.json);

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
