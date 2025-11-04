import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('numbers').collect();
  },
});

export const create = mutation({
  args: {
    value: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('numbers', { value: args.value });
  },
});
