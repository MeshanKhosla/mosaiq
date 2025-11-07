import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await authComponent.getAuthUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    storageId: v.id('_storage'),
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
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    return await ctx.db.insert('datasources', {
      name: args.name,
      fileName: args.fileName,
      fileSize: args.fileSize,
      storageId: args.storageId,
      columns: args.columns,
      createdBy: user._id,
    });
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
    return await ctx.storage.getUrl(datasource.storageId);
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
