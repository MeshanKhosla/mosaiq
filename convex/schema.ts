import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
    createdBy: v.string(),
  }).index('by_createdBy', ['createdBy']),

  // Datasources

  // Analyses
  // analyses: defineTable({
  //   datasourceId: v.array(v.id('datasources')),
  //   name: v.string(),
  //   sheets: v.array(v.id('sheets')),
  //   createdBy: v.id('users'),
  // }).index('by_createdBy', ['createdBy']),

  // Dashboards

  // Sheets

  // Visuals
});
