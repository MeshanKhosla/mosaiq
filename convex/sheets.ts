import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { authComponent } from './auth';

export const create = internalMutation({
  args: {
    analysisId: v.id('analyses'),
    name: v.string(),
  },
  returns: v.id('sheets'),
  handler: async (ctx, args) => {
    // Verify analysis exists
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    return await ctx.db.insert('sheets', {
      name: args.name.trim(),
      analysisId: args.analysisId,
      createdBy: analysis.createdBy,
    });
  },
});

export const getByAnalysis = query({
  args: {
    analysisId: v.id('analyses'),
  },
  returns: v.union(
    v.object({
      _id: v.id('sheets'),
      _creationTime: v.number(),
      name: v.string(),
      analysisId: v.id('analyses'),
      createdBy: v.string(),
      filters: v.optional(
        v.array(
          v.object({
            columnId: v.string(),
            selectedValues: v.array(v.union(v.string(), v.number())),
          }),
        ),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    // Verify analysis exists and belongs to user
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      return null;
    }

    // Find sheet for this analysis
    const sheet = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .first();

    return sheet;
  },
});

export const get = query({
  args: {
    id: v.id('sheets'),
  },
  returns: v.union(
    v.object({
      _id: v.id('sheets'),
      _creationTime: v.number(),
      name: v.string(),
      analysisId: v.id('analyses'),
      createdBy: v.string(),
      filters: v.optional(
        v.array(
          v.object({
            columnId: v.string(),
            selectedValues: v.array(v.union(v.string(), v.number())),
          }),
        ),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.createdBy !== user._id) {
      return null;
    }
    return sheet;
  },
});

export const updateFilters = mutation({
  args: {
    sheetId: v.id('sheets'),
    filters: v.array(
      v.object({
        columnId: v.string(),
        selectedValues: v.array(v.union(v.string(), v.number())),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error('Not authenticated');
    }

    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet || sheet.createdBy !== user._id) {
      throw new Error('Sheet not found or access denied');
    }

    await ctx.db.patch(args.sheetId, {
      filters: args.filters.length > 0 ? args.filters : undefined,
    });

    return null;
  },
});
