import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  datasources: defineTable({
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    // Array of records where each record has string keys and string|number values
    data: v.optional(
      v.array(v.record(v.string(), v.union(v.string(), v.number()))),
    ),
    // Record mapping column names to their types
    columnTypes: v.optional(
      v.record(
        v.string(),
        v.union(v.literal('string'), v.literal('number'), v.literal('date')),
      ),
    ),
    storageId: v.optional(v.id('_storage')), // Legacy field for old datasources
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
    sheetId: v.id('sheets'),
    datasourceId: v.id('datasources'),
    position: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    config: v.object({
      // Dimension for grouping (X-axis for bar/line, categories for pie, columns for table)
      dimension: v.optional(v.string()),
      // Measures with aggregations (Y-axis for bar/line, values for pie)
      measures: v.optional(
        v.array(
          v.object({
            column: v.string(),
            aggregation: v.union(
              v.literal('SUM'),
              v.literal('AVG'),
              v.literal('COUNT'),
              v.literal('MIN'),
              v.literal('MAX'),
              v.literal('NONE'),
            ),
          }),
        ),
      ),
      // For table type: which columns to display
      columns: v.optional(v.array(v.string())),
    }),
    createdBy: v.string(),
  })
    .index('by_sheetId', ['sheetId'])
    .index('by_createdBy', ['createdBy']),
});
