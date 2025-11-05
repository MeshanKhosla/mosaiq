import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('analyses'),
      _creationTime: v.number(),
      datasourceIds: v.array(v.id('datasources')),
      name: v.string(),
      createdBy: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }
    const userId = user._id;
    return await ctx.db
      .query('analyses')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id('analyses'),
  },
  returns: v.union(
    v.object({
      _id: v.id('analyses'),
      _creationTime: v.number(),
      datasourceIds: v.array(v.id('datasources')),
      name: v.string(),
      createdBy: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const analysis = await ctx.db.get(args.id);
    if (!analysis || analysis.createdBy !== user._id) {
      return null;
    }
    return analysis;
  },
});

export const create = mutation({
  args: {
    datasourceId: v.id('datasources'),
    name: v.string(),
  },
  returns: v.id('analyses'),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    // Verify datasource exists and belongs to user
    const datasource = await ctx.db.get(args.datasourceId);
    if (!datasource || datasource.createdBy !== user._id) {
      throw new Error('Datasource not found or unauthorized');
    }

    return await ctx.db.insert('analyses', {
      datasourceIds: [args.datasourceId],
      name: args.name.trim(),
      createdBy: user._id,
    });
  },
});
