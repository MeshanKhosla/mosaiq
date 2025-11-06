import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

const measureValidator = v.object({
  column: v.string(),
  aggregation: v.union(
    v.literal('SUM'),
    v.literal('AVG'),
    v.literal('COUNT'),
    v.literal('MIN'),
    v.literal('MAX'),
    v.literal('NONE'),
  ),
});

const configValidator = v.object({
  dimension: v.optional(v.string()),
  measures: v.optional(v.array(measureValidator)),
  columns: v.optional(v.array(v.string())),
});

export const list = query({
  args: {
    sheetId: v.id('sheets'),
  },
  returns: v.array(
    v.object({
      _id: v.id('visuals'),
      _creationTime: v.number(),
      type: v.union(
        v.literal('table'),
        v.literal('bar_chart'),
        v.literal('line_chart'),
        v.literal('pie_chart'),
      ),
      title: v.string(),
      sheetId: v.id('sheets'),
      datasourceId: v.id('datasources'),
      position: v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      }),
      config: configValidator,
      createdBy: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Verify the sheet belongs to the user
    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet || sheet.createdBy !== user._id) {
      return [];
    }

    return await ctx.db
      .query('visuals')
      .withIndex('by_sheetId', (q) => q.eq('sheetId', args.sheetId))
      .collect();
  },
});

export const create = mutation({
  args: {
    sheetId: v.id('sheets'),
    datasourceId: v.id('datasources'),
    type: v.union(
      v.literal('table'),
      v.literal('bar_chart'),
      v.literal('line_chart'),
      v.literal('pie_chart'),
    ),
    title: v.string(),
    position: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    config: configValidator,
  },
  returns: v.id('visuals'),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    // Verify the sheet exists and belongs to the user
    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet || sheet.createdBy !== user._id) {
      throw new Error('Sheet not found or unauthorized');
    }

    // Verify the datasource exists and belongs to the user
    const datasource = await ctx.db.get(args.datasourceId);
    if (!datasource || datasource.createdBy !== user._id) {
      throw new Error('Datasource not found or unauthorized');
    }

    return await ctx.db.insert('visuals', {
      type: args.type,
      title: args.title,
      sheetId: args.sheetId,
      datasourceId: args.datasourceId,
      position: args.position,
      config: args.config,
      createdBy: user._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('visuals'),
    title: v.optional(v.string()),
    position: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      }),
    ),
    config: v.optional(configValidator),
    datasourceId: v.optional(v.id('datasources')),
    type: v.optional(
      v.union(
        v.literal('table'),
        v.literal('bar_chart'),
        v.literal('line_chart'),
        v.literal('pie_chart'),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const visual = await ctx.db.get(args.id);
    if (!visual || visual.createdBy !== user._id) {
      throw new Error('Visual not found or unauthorized');
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.position !== undefined) updates.position = args.position;
    if (args.config !== undefined) updates.config = args.config;
    if (args.datasourceId !== undefined) {
      // Verify the datasource exists and belongs to the user
      const datasource = await ctx.db.get(args.datasourceId);
      if (!datasource || datasource.createdBy !== user._id) {
        throw new Error('Datasource not found or unauthorized');
      }
      updates.datasourceId = args.datasourceId;
    }
    if (args.type !== undefined) updates.type = args.type;

    await ctx.db.patch(args.id, updates);

    return null;
  },
});

export const deleteVisual = mutation({
  args: {
    id: v.id('visuals'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const visual = await ctx.db.get(args.id);
    if (!visual || visual.createdBy !== user._id) {
      throw new Error('Visual not found or unauthorized');
    }

    await ctx.db.delete(args.id);

    return null;
  },
});

export const getData = query({
  args: {
    visualId: v.id('visuals'),
  },
  returns: v.union(
    v.object({
      type: v.literal('chart'),
      labels: v.array(v.string()),
      datasets: v.array(
        v.object({
          name: v.string(),
          values: v.array(v.number()),
        }),
      ),
    }),
    v.object({
      type: v.literal('table'),
      columns: v.array(v.string()),
      rows: v.array(v.record(v.string(), v.union(v.string(), v.number()))),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error('Unauthorized');
    }

    const visual = await ctx.db.get(args.visualId);
    if (!visual || visual.createdBy !== user._id) {
      throw new Error('Visual not found or unauthorized');
    }

    const datasource = await ctx.db.get(visual.datasourceId);
    if (!datasource || !datasource.data) {
      throw new Error('Datasource not found or has no data');
    }

    const data = datasource.data;
    const config = visual.config;

    // Handle table type
    if (visual.type === 'table') {
      const columns = config.columns ?? Object.keys(data[0] ?? {});
      const rows = data.map((row) => {
        const filteredRow: Record<string, string | number> = {};
        for (const col of columns) {
          filteredRow[col] = row[col] ?? '';
        }
        return filteredRow;
      });

      return {
        type: 'table' as const,
        columns,
        rows,
      };
    }

    // Handle chart types (bar, line, pie)
    if (!config.dimension || !config.measures || config.measures.length === 0) {
      return {
        type: 'chart' as const,
        labels: [],
        datasets: [],
      };
    }

    const dimension = config.dimension;
    const measures = config.measures;

    // Group data by dimension
    const grouped = new Map<string, Record<string, Array<string | number>>>();

    for (const row of data) {
      const key = String(row[dimension] ?? 'Unknown');
      if (!grouped.has(key)) {
        grouped.set(key, {});
        for (const measure of measures) {
          grouped.get(key)![measure.column] = [];
        }
      }

      for (const measure of measures) {
        const value = row[measure.column];
        grouped.get(key)![measure.column].push(value);
      }
    }

    // Calculate aggregations
    const labels = Array.from(grouped.keys());
    const datasets = measures.map((measure) => {
      const values = labels.map((label) => {
        const groupValues = grouped.get(label)![measure.column];
        const numericValues = groupValues
          .map((val) => (typeof val === 'number' ? val : parseFloat(String(val))))
          .filter((val) => !isNaN(val));

        if (numericValues.length === 0) return 0;

        switch (measure.aggregation) {
          case 'SUM':
            return numericValues.reduce((a, b) => a + b, 0);
          case 'AVG':
            return (
              numericValues.reduce((a, b) => a + b, 0) / numericValues.length
            );
          case 'COUNT':
            return numericValues.length;
          case 'MIN':
            return Math.min(...numericValues);
          case 'MAX':
            return Math.max(...numericValues);
          case 'NONE':
            return numericValues[0] ?? 0;
          default:
            return 0;
        }
      });

      return {
        name: `${measure.column} (${measure.aggregation})`,
        values,
      };
    });

    return {
      type: 'chart' as const,
      labels,
      datasets,
    };
  },
});
