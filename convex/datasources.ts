import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

// Helper function to parse CSV line (handles quoted fields)
function parseCsvLine(line: string): Array<string> {
  const result: Array<string> = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }
    const userId = user._id;
    return await ctx.db
      .query('datasources')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id('datasources'),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const datasource = await ctx.db.get(args.id);
    if (!datasource || datasource.createdBy !== user._id) {
      return null;
    }
    return datasource;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    csvContent: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    // Parse CSV
    const lines = args.csvContent
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse headers
    const headers = parseCsvLine(lines[0]);
    if (headers.length === 0) {
      throw new Error('CSV file has no headers');
    }

    // Validate headers (no duplicates, no empty headers)
    const headerSet = new Set<string>();
    for (const header of headers) {
      if (!header || header.trim() === '') {
        throw new Error('CSV has empty headers');
      }
      if (headerSet.has(header)) {
        throw new Error(`CSV has duplicate header: ${header}`);
      }
      headerSet.add(header);
    }

    // Parse data rows
    const data: Array<Record<string, string | number>> = [];
    const columnTypeCounts: Record<
      string,
      { string: number; number: number; date: number }
    > = {};

    // Initialize type counters
    for (const header of headers) {
      columnTypeCounts[header] = { string: 0, number: 0, date: 0 };
    }

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);

      // Validate row has same number of columns as headers
      if (values.length !== headers.length) {
        throw new Error(
          `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`,
        );
      }

      const row: Record<string, string | number> = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        let value: string | number = values[j] || '';
        const trimmedValue = String(value).trim();

        // Detect type
        if (trimmedValue === '') {
          columnTypeCounts[header].string++;
        } else {
          const numValue = Number(trimmedValue);
          // Check if it's a date (YYYY-MM-DD or MM/DD/YYYY)
          const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/;
          if (datePattern.test(trimmedValue)) {
            columnTypeCounts[header].date++;
          } else if (!isNaN(numValue) && trimmedValue !== '') {
            columnTypeCounts[header].number++;
            value = numValue;
          } else {
            columnTypeCounts[header].string++;
          }
        }

        row[header] = value;
      }
      data.push(row);
    }

    if (data.length === 0) {
      throw new Error('CSV file has no data rows');
    }

    // Determine column types based on majority
    const columnTypes: Record<string, 'string' | 'number' | 'date'> = {};
    for (const header of headers) {
      const counts = columnTypeCounts[header];
      const total = counts.string + counts.number + counts.date;
      if (total === 0) {
        columnTypes[header] = 'string';
      } else if (counts.number > counts.string && counts.number > counts.date) {
        columnTypes[header] = 'number';
      } else if (counts.date > counts.string) {
        columnTypes[header] = 'date';
      } else {
        columnTypes[header] = 'string';
      }
    }

    // Create datasource with parsed data
    return await ctx.db.insert('datasources', {
      name: args.name,
      fileName: args.fileName,
      fileSize: args.fileSize,
      data,
      columnTypes,
      createdBy: user._id,
    });
  },
});

export const getChartData = query({
  args: {
    datasourceId: v.id('datasources'),
    groupBy: v.string(),
    measures: v.array(
      v.object({
        field: v.string(),
        aggregation: v.union(
          v.literal('SUM'),
          v.literal('COUNT'),
          v.literal('AVG'),
          v.literal('MAX'),
          v.literal('MIN'),
        ),
      }),
    ),
    filters: v.optional(
      v.array(
        v.object({
          field: v.string(),
          operator: v.union(
            v.literal('equals'),
            v.literal('not_equals'),
            v.literal('greater_than'),
            v.literal('less_than'),
            v.literal('contains'),
          ),
          value: v.union(v.string(), v.number()),
        }),
      ),
    ),
    orderBy: v.optional(
      v.object({
        field: v.string(),
        direction: v.union(v.literal('ASC'), v.literal('DESC')),
      }),
    ),
  },
  returns: v.object({
    labels: v.array(v.string()),
    values: v.array(v.number()),
    measureName: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return { labels: [], values: [], measureName: '' };
    }

    const datasource = await ctx.db.get(args.datasourceId);
    if (!datasource || datasource.createdBy !== user._id) {
      return { labels: [], values: [], measureName: '' };
    }

    if (!datasource.data || datasource.data.length === 0) {
      return { labels: [], values: [], measureName: '' };
    }

    // Validate fields exist in data
    const firstRow = datasource.data[0];
    const availableFields = Object.keys(firstRow);

    if (!availableFields.includes(args.groupBy)) {
      throw new Error(`Group by field "${args.groupBy}" not found in data`);
    }

    for (const measure of args.measures) {
      if (!availableFields.includes(measure.field)) {
        throw new Error(`Measure field "${measure.field}" not found in data`);
      }
    }

    if (args.filters) {
      for (const filter of args.filters) {
        if (!availableFields.includes(filter.field)) {
          throw new Error(`Filter field "${filter.field}" not found in data`);
        }
      }
    }

    // Apply filters
    let filteredData = datasource.data;
    if (args.filters && args.filters.length > 0) {
      filteredData = datasource.data.filter((row) => {
        return args.filters!.every((filter) => {
          const rowValue = row[filter.field];
          const filterValue = filter.value;

          switch (filter.operator) {
            case 'equals':
              return rowValue === filterValue;
            case 'not_equals':
              return rowValue !== filterValue;
            case 'greater_than':
              return Number(rowValue) > Number(filterValue);
            case 'less_than':
              return Number(rowValue) < Number(filterValue);
            case 'contains':
              return String(rowValue)
                .toLowerCase()
                .includes(String(filterValue).toLowerCase());
            default:
              return true;
          }
        });
      });
    }

    // Group by field and aggregate measures
    const grouped: Record<
      string,
      Record<string, { sum: number; count: number; values: Array<number> }>
    > = {};

    for (const row of filteredData) {
      const groupKey = String(row[args.groupBy] || '');
      if (!(groupKey in grouped)) {
        grouped[groupKey] = {};
        for (const measure of args.measures) {
          grouped[groupKey][measure.field] = {
            sum: 0,
            count: 0,
            values: [],
          };
        }
      }

      for (const measure of args.measures) {
        const value = Number(row[measure.field] || 0);
        grouped[groupKey][measure.field].sum += value;
        grouped[groupKey][measure.field].count += 1;
        grouped[groupKey][measure.field].values.push(value);
      }
    }

    // Calculate aggregated values
    const results: Array<{ label: string; value: number }> = [];
    for (const [groupKey, measures] of Object.entries(grouped)) {
      // Use first measure for now (can extend to multiple measures later)
      const measure = args.measures[0];
      const measureData = measures[measure.field];
      let aggregatedValue = 0;

      switch (measure.aggregation) {
        case 'SUM':
          aggregatedValue = measureData.sum;
          break;
        case 'COUNT':
          aggregatedValue = measureData.count;
          break;
        case 'AVG':
          aggregatedValue =
            measureData.count > 0 ? measureData.sum / measureData.count : 0;
          break;
        case 'MAX':
          aggregatedValue = Math.max(...measureData.values);
          break;
        case 'MIN':
          aggregatedValue = Math.min(...measureData.values);
          break;
      }

      results.push({ label: groupKey, value: aggregatedValue });
    }

    // Sort results
    if (args.orderBy) {
      const orderField = args.orderBy.field;
      const direction = args.orderBy.direction === 'ASC' ? 1 : -1;

      results.sort((a, b) => {
        if (orderField === args.groupBy) {
          return a.label.localeCompare(b.label) * direction;
        }
        // Sort by measure value
        return (a.value - b.value) * direction;
      });
    } else {
      // Default: sort by value descending
      results.sort((a, b) => b.value - a.value);
    }

    const labels = results.map((r) => r.label);
    const values = results.map((r) => r.value);
    const measureName = args.measures[0]
      ? `${args.measures[0].aggregation}(${args.measures[0].field})`
      : '';

    return { labels, values, measureName };
  },
});

export const updateColumnType = mutation({
  args: {
    datasourceId: v.id('datasources'),
    columnName: v.string(),
    columnType: v.union(
      v.literal('string'),
      v.literal('number'),
      v.literal('date'),
    ),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const datasource = await ctx.db.get(args.datasourceId);

    if (!datasource || datasource.createdBy !== user._id) {
      throw new Error('Datasource not found or unauthorized');
    }

    const columnTypes = datasource.columnTypes || {};
    columnTypes[args.columnName] = args.columnType;

    await ctx.db.patch(args.datasourceId, {
      columnTypes,
    });
  },
});

export const updateName = mutation({
  args: {
    datasourceId: v.id('datasources'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const datasource = await ctx.db.get(args.datasourceId);

    if (!datasource || datasource.createdBy !== user._id) {
      throw new Error('Datasource not found or unauthorized');
    }

    await ctx.db.patch(args.datasourceId, {
      name: args.name.trim(),
    });
  },
});
