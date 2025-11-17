import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  datasources: defineTable({
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    columns: v.array(
      v.object({
        _id: v.string(),
        name: v.string(),
        type: v.union(
          v.literal('string'),
          v.literal('number'),
          v.literal('date'),
        ),
      }),
    ),
    storageKey: v.string(),
    createdBy: v.string(),
    type: v.optional(v.union(v.literal('csv'), v.literal('url'))),
    sourceUrl: v.optional(v.string()),
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
    filters: v.optional(
      v.array(
        v.object({
          columnId: v.string(),
          selectedValues: v.array(v.union(v.string(), v.number())),
        }),
      ),
    ),
  })
    .index('by_createdBy', ['createdBy'])
    .index('by_analysisId', ['analysisId']),

  dashboards: defineTable({
    name: v.string(),
    sourceAnalysisId: v.id('analyses'),
    createdBy: v.string(),
    isPublic: v.optional(v.boolean()),
  }).index('by_createdBy', ['createdBy']),

  dashboardShares: defineTable({
    dashboardId: v.id('dashboards'),
    sharedWithUserId: v.string(),
    sharedWithEmail: v.string(),
    sharedBy: v.string(),
  })
    .index('by_dashboardId', ['dashboardId'])
    .index('by_sharedWithUserId', ['sharedWithUserId'])
    .index('by_sharedWithEmail', ['sharedWithEmail']),

  visuals: defineTable({
    sheetId: v.id('sheets'),
    type: v.union(
      v.literal('table'),
      v.literal('bar_chart'),
      v.literal('line_chart'),
      v.literal('pie_chart'),
    ),
    title: v.optional(v.string()),
    position: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    createdBy: v.string(),
    axes: v.optional(
      v.object({
        dimensions: v.optional(v.array(v.string())), // Ids of columns
        measures: v.optional(
          v.array(
            v.object({
              columnId: v.string(),
              aggregation: v.string(),
            }),
          ),
        ),
      }),
    ),
  })
    .index('by_sheetId', ['sheetId'])
    .index('by_createdBy', ['createdBy']),

  subscriptions: defineTable({
    userId: v.string(),
    productId: v.string(),
    isActive: v.boolean(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_productId', ['userId', 'productId']),
});
