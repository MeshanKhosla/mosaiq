import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  datasources: defineTable({
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    // Record mapping column names to their types
    columnTypes: v.optional(
      v.record(
        v.string(),
        v.union(v.literal('string'), v.literal('number'), v.literal('date')),
      ),
    ),
    storageId: v.id('_storage'),
    createdBy: v.string(),
  }).index('by_createdBy', ['createdBy']),

  analyses: defineTable({
    datasourceIds: v.array(v.id('datasources')),
    name: v.string(),
    createdBy: v.string(),
  }).index('by_createdBy', ['createdBy']),

  sheets: defineTable({
    name: v.string(),
    analysisId: v.id('analyses'),
    createdBy: v.string(),
  })
    .index('by_createdBy', ['createdBy'])
    .index('by_analysisId', ['analysisId']),

  dashboards: defineTable({
    name: v.string(),
    sourceAnalysisId: v.id('analyses'),
    createdBy: v.string(),
  }).index('by_createdBy', ['createdBy']),

  visuals: defineTable({
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
  }),
});
