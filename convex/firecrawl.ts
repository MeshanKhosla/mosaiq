'use node';

import { v } from 'convex/values';
import { FirecrawlClient } from '@mendable/firecrawl-js';
import { action } from './_generated/server';

const TIMEOUT = 5 * 60 * 1000; // 5 minutes

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

  const plainNumericPattern = /^-?\d+(\.\d+)?$/;
  if (plainNumericPattern.test(stringValue)) {
    return stringValue;
  }

  const numericWithSuffixPattern = /^(-?\d+(\.\d+)?)\s*([KMBkmb])$/;
  const suffixMatch = stringValue.match(numericWithSuffixPattern);
  if (suffixMatch) {
    const numValue = parseFloat(suffixMatch[1]);
    const suffix = suffixMatch[3].toUpperCase();
    let multiplier = 1;
    if (suffix === 'K') {
      multiplier = 1000;
    } else if (suffix === 'M') {
      multiplier = 1000000;
    } else if (suffix === 'B') {
      multiplier = 1000000000;
    }
    return String(Math.round(numValue * multiplier));
  }

  return stringValue;
}

function flattenValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => flattenValue(item)).join('; ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function extractArrayFromData(
  data: any,
  depth = 0,
  maxDepth = 5,
): Array<Record<string, any>> | null {
  if (depth > maxDepth) {
    return null;
  }

  if (Array.isArray(data)) {
    const filtered = data.filter(
      (item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
    return filtered.length > 0 ? filtered : null;
  }

  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);

    const priorityKeys = [
      'tables',
      'data',
      'rows',
      'items',
      'results',
      'records',
    ];

    for (const priorityKey of priorityKeys) {
      if (keys.includes(priorityKey)) {
        const value = data[priorityKey];
        if (Array.isArray(value)) {
          const filtered = value.filter(
            (item) =>
              typeof item === 'object' && item !== null && !Array.isArray(item),
          );
          if (filtered.length > 0) {
            return filtered;
          }
        }
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          const nestedResult = extractArrayFromData(value, depth + 1, maxDepth);
          if (nestedResult && nestedResult.length > 0) {
            return nestedResult;
          }
        }
      }
    }

    for (const key of keys) {
      const value = data[key];

      if (Array.isArray(value)) {
        const filtered = value.filter(
          (item) =>
            typeof item === 'object' && item !== null && !Array.isArray(item),
        );
        if (filtered.length > 0) {
          return filtered;
        }
      }

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const nestedResult = extractArrayFromData(value, depth + 1, maxDepth);
        if (nestedResult && nestedResult.length > 0) {
          return nestedResult;
        }
      }
    }

    const firstArrayValue = Object.values(data).find(
      (value) => Array.isArray(value) && value.length > 0,
    );
    if (firstArrayValue && Array.isArray(firstArrayValue)) {
      const filtered = firstArrayValue.filter(
        (item) =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      );
      if (filtered.length > 0) {
        return filtered;
      }
    }

    return [data];
  }

  return null;
}

function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const arrayData = extractArrayFromData(data);
  if (!arrayData || arrayData.length === 0) {
    return '';
  }

  const allKeys = new Set<string>();
  for (const item of arrayData) {
    Object.keys(item).forEach((key) => allKeys.add(key));
  }

  const headers = Array.from(allKeys);
  if (headers.length === 0) {
    return '';
  }

  const rows = [headers.join(',')];
  for (const item of arrayData) {
    const values = headers.map((header) => {
      const value = item[header];
      const flattened = flattenValue(value);
      const normalizedValue = normalizeNumericValue(flattened);
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
      timeoutMs: TIMEOUT,
    });

    try {
      const result = await app.scrape(args.url, {
        timeout: TIMEOUT,
        formats: [
          {
            type: 'json',
            schema: {
              type: 'object',
              required: [],
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
            prompt:
              'Extract all tabular data and structured information from this page. Return the data as an object with a "data" property containing an array of objects, where each object represents a row with keys as column names. If there are multiple tables, combine them into a single array. If the page contains non-tabular data, structure it as an array with objects containing key-value pairs. Always return data in the format: { "data": [{...}, {...}] }',
          },
        ],
      });

      if (!result.json) {
        throw new Error('No JSON data returned from Firecrawl');
      }

      const csvContent = convertToCSV(result.json);

      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error(
          `Could not extract structured data from the URL. Firecrawl returned: ${JSON.stringify(result.json).substring(0, 200)}`,
        );
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
