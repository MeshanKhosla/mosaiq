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
  }).index('by_createdBy', ['createdBy']),

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
        measures: v.optional(v.array(v.string())), // Ids of columns
      }),
    ),
  })
    .index('by_sheetId', ['sheetId'])
    .index('by_createdBy', ['createdBy']),
});
