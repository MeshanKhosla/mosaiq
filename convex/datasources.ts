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

export const getFileUrl = query({
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
    // Get the signed URL for the file
    return await ctx.storage.getUrl(datasource.storageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    storageId: v.id('_storage'),
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    return await ctx.db.insert('datasources', {
      storageId: args.storageId,
      name: args.name,
      fileName: args.fileName,
      fileSize: args.fileSize,
      createdBy: user._id,
    });
  },
});
