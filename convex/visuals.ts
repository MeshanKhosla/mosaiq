import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

export const create = mutation({
  args: {
    sheetId: v.id('sheets'),
    type: v.union(
      v.literal('table'),
      v.literal('bar_chart'),
      v.literal('line_chart'),
      v.literal('pie_chart'),
    ),
    title: v.string(),
    position: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    axes: v.optional(
      v.object({
        dimensions: v.optional(v.array(v.string())),
        measures: v.optional(v.array(v.string())),
      }),
    ),
  },
  returns: v.id('visuals'),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    // Verify sheet exists and belongs to user
    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet || sheet.createdBy !== user._id) {
      throw new Error('Sheet not found or unauthorized');
    }

    // Create the visual
    const visualId = await ctx.db.insert('visuals', {
      sheetId: args.sheetId,
      type: args.type,
      title: args.title.trim(),
      position: args.position,
      createdBy: user._id,
      axes: args.axes,
    });

    return visualId;
  },
});

export const getBySheet = query({
  args: {
    sheetId: v.id('sheets'),
  },
  returns: v.union(
    v.array(
      v.object({
        _id: v.id('visuals'),
        _creationTime: v.number(),
        sheetId: v.id('sheets'),
        type: v.union(
          v.literal('table'),
          v.literal('bar_chart'),
          v.literal('line_chart'),
          v.literal('pie_chart'),
        ),
        title: v.string(),
        position: v.object({
          x: v.number(),
          y: v.number(),
          width: v.number(),
          height: v.number(),
        }),
        createdBy: v.string(),
        axes: v.optional(
          v.object({
            dimensions: v.optional(v.array(v.string())),
            measures: v.optional(v.array(v.string())),
          }),
        ),
      }),
    ),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return;
    }

    // Verify sheet exists and belongs to user
    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet || sheet.createdBy !== user._id) {
      return [];
    }

    // Get all visuals for this sheet
    return await ctx.db
      .query('visuals')
      .withIndex('by_sheetId', (q) => q.eq('sheetId', args.sheetId))
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id('visuals'),
  },
  returns: v.union(
    v.object({
      _id: v.id('visuals'),
      _creationTime: v.number(),
      sheetId: v.id('sheets'),
      type: v.union(
        v.literal('table'),
        v.literal('bar_chart'),
        v.literal('line_chart'),
        v.literal('pie_chart'),
      ),
      title: v.string(),
      position: v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      }),
      createdBy: v.string(),
      axes: v.optional(
        v.object({
          dimensions: v.optional(v.array(v.string())),
          measures: v.optional(v.array(v.string())),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const visual = await ctx.db.get(args.id);
    if (!visual || visual.createdBy !== user._id) {
      return null;
    }
    return visual;
  },
});

export const updateAxes = mutation({
  args: {
    id: v.id('visuals'),
    axes: v.optional(
      v.object({
        dimensions: v.optional(v.array(v.string())),
        measures: v.optional(v.array(v.string())),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const visual = await ctx.db.get(args.id);
    if (!visual || visual.createdBy !== user._id) {
      throw new Error('Visual not found or unauthorized');
    }

    await ctx.db.patch(args.id, {
      axes: args.axes,
    });

    return null;
  },
});

export const updatePosition = mutation({
  args: {
    id: v.id('visuals'),
    position: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const visual = await ctx.db.get(args.id);
    if (!visual || visual.createdBy !== user._id) {
      throw new Error('Visual not found or unauthorized');
    }

    await ctx.db.patch(args.id, {
      position: args.position,
    });

    return null;
  },
});

export const deleteVisual = mutation({
  args: {
    id: v.id('visuals'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const visual = await ctx.db.get(args.id);
    if (!visual || visual.createdBy !== user._id) {
      throw new Error('Visual not found or unauthorized');
    }

    // Delete the visual
    await ctx.db.delete(args.id);

    return null;
  },
});
