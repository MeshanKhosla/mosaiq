import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

export const list = query({
  args: {
    analysisId: v.id('analyses'),
  },
  returns: v.array(
    v.object({
      _id: v.id('sheets'),
      _creationTime: v.number(),
      name: v.string(),
      analysisId: v.id('analyses'),
      createdBy: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Verify the analysis belongs to the user
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      return [];
    }

    return await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();
  },
});

export const create = mutation({
  args: {
    analysisId: v.id('analyses'),
  },
  returns: v.id('sheets'),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    // Verify the analysis exists and belongs to the user
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      throw new Error('Analysis not found or unauthorized');
    }

    // Get existing sheets to generate the next sheet name
    const existingSheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();

    const sheetNumber = existingSheets.length + 1;
    const name = `Sheet ${sheetNumber}`;

    return await ctx.db.insert('sheets', {
      name,
      analysisId: args.analysisId,
      createdBy: user._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('sheets'),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.createdBy !== user._id) {
      throw new Error('Sheet not found or unauthorized');
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
    });

    return null;
  },
});

export const deleteSheet = mutation({
  args: {
    id: v.id('sheets'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.createdBy !== user._id) {
      throw new Error('Sheet not found or unauthorized');
    }

    // Cascade delete all visuals in this sheet
    const visuals = await ctx.db
      .query('visuals')
      .withIndex('by_sheetId', (q) => q.eq('sheetId', args.id))
      .collect();

    for (const visual of visuals) {
      await ctx.db.delete(visual._id);
    }

    // Delete the sheet
    await ctx.db.delete(args.id);

    return null;
  },
});
