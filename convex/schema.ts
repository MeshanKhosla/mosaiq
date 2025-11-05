import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
    // Reference to Better Auth user table (Better Auth creates a "user" table)
    createdBy: v.string(),
  }).index('by_createdBy', ['createdBy']),
});
