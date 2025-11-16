import { R2 } from '@convex-dev/r2';
import { v } from 'convex/values';
import { action, mutation, query } from './_generated/server';
import { api, components } from './_generated/api';
import { authComponent } from './auth';
import type { DataModel } from './_generated/dataModel';

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await authComponent.getAuthUser(ctx as any);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 'Unauthenticated';
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

export const getForViewer = query({
  args: {
    id: v.id('datasources'),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const datasource = await ctx.db.get(args.id);
    if (!datasource) {
      return null;
    }
    return datasource;
  },
});

export const getStorageUrlForViewer = query({
  args: {
    datasourceId: v.id('datasources'),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const datasource = await ctx.db.get(args.datasourceId);
    if (!datasource) {
      return null;
    }
    return await r2.getUrl(datasource.storageKey);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    storageKey: v.string(),
    columns: v.array(
      v.object({
        _id: v.string(),
        name: v.string(),
        type: v.union(
          v.literal('string'),
          v.literal('number'),
          v.literal('date'),
        ),
      }),
    ),
    type: v.optional(v.union(v.literal('csv'), v.literal('url'))),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    return await ctx.db.insert('datasources', {
      name: args.name,
      fileName: args.fileName,
      fileSize: args.fileSize,
      storageKey: args.storageKey,
      columns: args.columns,
      createdBy: user._id,
      type: args.type ?? 'csv',
      sourceUrl: args.sourceUrl,
    });
  },
});

export const scrapeUrlForUpload = action({
  args: {
    url: v.string(),
  },
  returns: v.object({
    csvContent: v.string(),
  }),
  handler: async (ctx, args): Promise<{ csvContent: string }> => {
    await authComponent.getAuthUser(ctx as any);

    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Call Firecrawl action to scrape the URL
    const csvContent: string = await ctx.runAction(api.firecrawl.scrapeUrl, {
      url: args.url,
    });

    return { csvContent };
  },
});

export const getStorageUrl = query({
  args: {
    datasourceId: v.id('datasources'),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const datasource = await ctx.db.get(args.datasourceId);
    if (!datasource || datasource.createdBy !== user._id) {
      return null;
    }
    return await r2.getUrl(datasource.storageKey);
  },
});

export const updateColumnType = mutation({
  args: {
    datasourceId: v.id('datasources'),
    columnId: v.string(),
    type: v.union(v.literal('string'), v.literal('number'), v.literal('date')),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const datasource = await ctx.db.get(args.datasourceId);

    if (!datasource || datasource.createdBy !== user._id) {
      throw new Error('Datasource not found or unauthorized');
    }

    const columns = datasource.columns;
    const column = columns.find((c) => c._id === args.columnId);
    if (!column) {
      throw new Error('Column not found');
    }
    column.type = args.type;

    await ctx.db.patch(args.datasourceId, {
      columns: columns,
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
