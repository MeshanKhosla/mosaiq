import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

export const create = mutation({
  args: {
    analysisId: v.id('analyses'),
    name: v.string(),
  },
  returns: v.object({
    dashboardId: v.id('dashboards'),
    sheetId: v.id('sheets'),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    // Verify analysis exists and belongs to user
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      throw new Error('Analysis not found or unauthorized');
    }

    const dashboardId = await ctx.db.insert('dashboards', {
      name: args.name.trim(),
      sourceAnalysisId: args.analysisId,
      createdBy: user._id,
      isPublic: false,
    });

    // Get the first sheet from the source analysis
    const sheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();

    if (sheets.length === 0) {
      throw new Error('Analysis has no sheets');
    }

    const sortedSheets = sheets.sort(
      (a, b) => a._creationTime - b._creationTime,
    );
    const sheetId = sortedSheets[0]._id;

    return { dashboardId, sheetId };
  },
});

export const createWithSharing = mutation({
  args: {
    analysisId: v.id('analyses'),
    name: v.string(),
    isPublic: v.optional(v.boolean()),
    sharedWithEmails: v.optional(v.array(v.string())),
  },
  returns: v.object({
    dashboardId: v.id('dashboards'),
    sheetId: v.id('sheets'),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.createdBy !== user._id) {
      throw new Error('Analysis not found or unauthorized');
    }

    const dashboardId = await ctx.db.insert('dashboards', {
      name: args.name.trim(),
      sourceAnalysisId: args.analysisId,
      createdBy: user._id,
      isPublic: args.isPublic ?? false,
    });

    if (args.sharedWithEmails && args.sharedWithEmails.length > 0) {
      for (const email of args.sharedWithEmails) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(email)) {
          await ctx.db.insert('dashboardShares', {
            dashboardId,
            sharedWithUserId: 'pending',
            sharedWithEmail: email.toLowerCase(),
            sharedBy: user._id,
          });
        }
      }
    }

    // Get the first sheet from the source analysis
    const sheets = await ctx.db
      .query('sheets')
      .withIndex('by_analysisId', (q) => q.eq('analysisId', args.analysisId))
      .collect();

    if (sheets.length === 0) {
      throw new Error('Analysis has no sheets');
    }

    const sortedSheets = sheets.sort(
      (a, b) => a._creationTime - b._creationTime,
    );
    const sheetId = sortedSheets[0]._id;

    return { dashboardId, sheetId };
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

export const getForViewer = query({
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
      isPublic: v.optional(v.boolean()),
      isAuthor: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const dashboard = await ctx.db.get(args.id);
    if (!dashboard) {
      return null;
    }

    const isAuthor = dashboard.createdBy === user._id;
    const isPublic = dashboard.isPublic ?? false;

    if (!isAuthor && !isPublic) {
      const share = await ctx.db
        .query('dashboardShares')
        .withIndex('by_dashboardId', (q) => q.eq('dashboardId', args.id))
        .collect();

      const hasAccess = share.some((s) => s.sharedWithUserId === user._id);

      if (!hasAccess) {
        return null;
      }
    }

    return {
      ...dashboard,
      isAuthor,
    };
  },
});

export const updateName = mutation({
  args: {
    id: v.id('dashboards'),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const dashboard = await ctx.db.get(args.id);
    if (!dashboard || dashboard.createdBy !== user._id) {
      throw new Error('Dashboard not found or unauthorized');
    }
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error('Dashboard name cannot be empty');
    }
    await ctx.db.patch(args.id, {
      name: trimmedName,
    });
    return null;
  },
});

export const shareWithUser = mutation({
  args: {
    dashboardId: v.id('dashboards'),
    userEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const dashboard = await ctx.db.get(args.dashboardId);
    if (!dashboard || dashboard.createdBy !== user._id) {
      throw new Error('Dashboard not found or unauthorized');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.userEmail)) {
      throw new Error('Invalid email address');
    }

    const existingShare = await ctx.db
      .query('dashboardShares')
      .withIndex('by_dashboardId', (q) => q.eq('dashboardId', args.dashboardId))
      .filter((q) =>
        q.eq(q.field('sharedWithEmail'), args.userEmail.toLowerCase()),
      )
      .first();

    if (existingShare) {
      return null;
    }

    await ctx.db.insert('dashboardShares', {
      dashboardId: args.dashboardId,
      sharedWithUserId: 'pending',
      sharedWithEmail: args.userEmail.toLowerCase(),
      sharedBy: user._id,
    });

    return null;
  },
});

export const unshareWithUser = mutation({
  args: {
    dashboardId: v.id('dashboards'),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const dashboard = await ctx.db.get(args.dashboardId);
    if (!dashboard || dashboard.createdBy !== user._id) {
      throw new Error('Dashboard not found or unauthorized');
    }

    const share = await ctx.db
      .query('dashboardShares')
      .withIndex('by_dashboardId', (q) => q.eq('dashboardId', args.dashboardId))
      .filter((q) => q.eq(q.field('sharedWithUserId'), args.userId))
      .first();

    if (share) {
      await ctx.db.delete(share._id);
    }

    return null;
  },
});

export const setPublic = mutation({
  args: {
    dashboardId: v.id('dashboards'),
    isPublic: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const dashboard = await ctx.db.get(args.dashboardId);
    if (!dashboard || dashboard.createdBy !== user._id) {
      throw new Error('Dashboard not found or unauthorized');
    }

    await ctx.db.patch(args.dashboardId, {
      isPublic: args.isPublic,
    });

    return null;
  },
});

export const getSharedWith = query({
  args: {
    dashboardId: v.id('dashboards'),
  },
  returns: v.union(
    v.array(
      v.object({
        userId: v.string(),
        email: v.string(),
      }),
    ),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const dashboard = await ctx.db.get(args.dashboardId);
    if (!dashboard || dashboard.createdBy !== user._id) {
      return null;
    }

    const shares = await ctx.db
      .query('dashboardShares')
      .withIndex('by_dashboardId', (q) => q.eq('dashboardId', args.dashboardId))
      .collect();

    return shares.map((share) => ({
      userId: share.sharedWithUserId,
      email: share.sharedWithEmail,
      name: undefined,
    }));
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 'Unauthenticated';
    }
    const userId = user._id;
    return await ctx.db
      .query('dashboards')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
      .collect();
  },
});
