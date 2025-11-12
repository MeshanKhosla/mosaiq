import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

export const create = mutation({
  args: {
    analysisId: v.id('analyses'),
    name: v.string(),
  },
  returns: v.id('dashboards'),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    // Verify analysis exists and belongs to user
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      throw new Error('Analysis not found or unauthorized');
    }

    return await ctx.db.insert('dashboards', {
      name: args.name.trim(),
      sourceAnalysisId: args.analysisId,
      createdBy: user._id,
    });
  },
});

export const get = query({
  args: {
    id: v.id('dashboards'),
  },
  returns: v.union(
    v.object({
      _id: v.id('dashboards'),
      _creationTime: v.number(),
      name: v.string(),
      sourceAnalysisId: v.id('analyses'),
      createdBy: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const dashboard = await ctx.db.get(args.id);
    if (!dashboard || dashboard.createdBy !== user._id) {
      return null;
    }
    return dashboard;
  },
});

export const list = query({
  args: {},
  returns: v.union(
    v.array(
      v.object({
        _id: v.id('dashboards'),
        _creationTime: v.number(),
        name: v.string(),
        sourceAnalysisId: v.id('analyses'),
        createdBy: v.string(),
      }),
    ),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return;
    }
    const userId = user._id;
    return await ctx.db
      .query('dashboards')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
      .collect();
  },
});
