import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

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
  returns: v.object({
    analysisId: v.id('analyses'),
    sheetId: v.id('sheets'),
  }),
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

    // Automatically create a default sheet for the analysis synchronously
    const sheetId = await ctx.db.insert('sheets', {
      name: 'Sheet 1',
      analysisId,
      createdBy: user._id,
    });

    return { analysisId, sheetId };
  },
});

export const updateName = mutation({
  args: {
    id: v.id('analyses'),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const analysis = await ctx.db.get(args.id);
    if (!analysis || analysis.createdBy !== user._id) {
      throw new Error('Analysis not found or unauthorized');
    }
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error('Analysis name cannot be empty');
    }
    await ctx.db.patch(args.id, {
      name: trimmedName,
    });
    return null;
  },
});
