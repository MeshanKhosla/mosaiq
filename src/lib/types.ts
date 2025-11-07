import type { Doc } from '../../convex/_generated/dataModel';

/**
 * Column type extracted from the Convex schema
 * This is the type of values in the columns array
 */
export type ColumnType = NonNullable<
  Doc<'datasources'>['columns']
>[number]['type'];

/**
 * Data table row type - represents a single row of CSV data
 * This matches the structure returned by getCsvData
 */
export type DataTableRow = Record<string, string | number>;

export type Axes = Doc<'visuals'>['axes'];
