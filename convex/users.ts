import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { authComponent } from './auth';

export const getByEmail = mutation({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await authComponent.safeGetAuthUser(ctx);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      return null;
    }

    return {
      id: 'pending',
      email: args.email.toLowerCase(),
      name: undefined,
    };
  },
});
