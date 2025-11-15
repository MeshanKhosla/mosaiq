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

const sheetSchema = v.object({
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
});

export const getByAnalysis = query({
  args: {
    analysisId: v.id('analyses'),
  },
  returns: v.union(v.array(sheetSchema), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      return null;
    }

    const sheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();

    return sheets.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const getAllByAnalysis = query({
  args: {
    analysisId: v.id('analyses'),
  },
  returns: v.union(v.array(sheetSchema), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      return null;
    }

    const sheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();

    return sheets.sort((a, b) => a._creationTime - b._creationTime);
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

export const createSheet = mutation({
  args: {
    analysisId: v.id('analyses'),
    name: v.optional(v.string()),
  },
  returns: v.id('sheets'),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      throw new Error('Analysis not found or unauthorized');
    }

    const existingSheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();

    if (existingSheets.length >= 5) {
      throw new Error('Maximum of 5 sheets allowed per analysis');
    }

    let sheetName = args.name?.trim();
    if (!sheetName) {
      const sheetNumber = existingSheets.length + 1;
      sheetName = `Sheet ${sheetNumber}`;
    }

    return await ctx.db.insert('sheets', {
      name: sheetName,
      analysisId: args.analysisId,
      createdBy: user._id,
    });
  },
});

export const updateName = mutation({
  args: {
    sheetId: v.id('sheets'),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet || sheet.createdBy !== user._id) {
      throw new Error('Sheet not found or unauthorized');
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error('Sheet name cannot be empty');
    }

    await ctx.db.patch(args.sheetId, {
      name: trimmedName,
    });

    return null;
  },
});

export const deleteSheet = mutation({
  args: {
    sheetId: v.id('sheets'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet || sheet.createdBy !== user._id) {
      throw new Error('Sheet not found or unauthorized');
    }

    const allSheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', sheet.analysisId))
      .collect();

    if (allSheets.length <= 1) {
      throw new Error('Cannot delete the last remaining sheet');
    }

    const visuals = await ctx.db
      .query('visuals')
      .withIndex('by_sheetId', (q) => q.eq('sheetId', args.sheetId))
      .collect();

    for (const visual of visuals) {
      await ctx.db.delete(visual._id);
    }

    await ctx.db.delete(args.sheetId);

    return null;
  },
});

export const getByAnalysisForViewer = query({
  args: {
    analysisId: v.id('analyses'),
  },
  returns: v.union(v.array(sheetSchema), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      return null;
    }

    const sheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();

    return sheets.sort((a, b) => a._creationTime - b._creationTime);
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
