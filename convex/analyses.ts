import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';
import { internal } from './_generated/api';

export const list = query({
  args: {},
  returns: v.union(
    v.array(
      v.object({
        _id: v.id('analyses'),
        _creationTime: v.number(),
        datasourceIds: v.array(v.id('datasources')),
        name: v.string(),
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

export const getForViewer = query({
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
    if (!analysis) {
      return null;
    }
    return analysis;
  },
});

export const getByDatasourceId = query({
  args: {
    datasourceId: v.id('datasources'),
  },
  returns: v.union(
    v.array(
      v.object({
        _id: v.id('analyses'),
        _creationTime: v.number(),
        datasourceIds: v.array(v.id('datasources')),
        name: v.string(),
        createdBy: v.string(),
      }),
    ),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return;
    }
    const userId = user._id;

    // Query all analyses by user (indexed), then filter by datasourceId
    const allAnalyses = await ctx.db
      .query('analyses')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
      .collect();

    // Filter analyses that include this datasource
    return allAnalyses.filter((analysis) =>
      analysis.datasourceIds.includes(args.datasourceId),
    );
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

    const analysisId = await ctx.db.insert('analyses', {
      datasourceIds: [args.datasourceId],
      name: args.name.trim(),
      createdBy: user._id,
    });

    // Automatically create a default sheet for the analysis
    await ctx.scheduler.runAfter(0, internal.sheets.create, {
      analysisId,
      name: 'Sheet 1',
    });

    return analysisId;
  },
});
