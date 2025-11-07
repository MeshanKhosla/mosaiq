import type { Doc } from '../../convex/_generated/dataModel';

/**
 * Column type extracted from the Convex schema
 * This is the type of values in the columnTypes record
 */
export type ColumnType = NonNullable<Doc<'datasources'>['columnTypes']>[string];

/**
 * Data table row type - represents a single row of CSV data
 * This matches the structure returned by getCsvData
 */
export type DataTableRow = Record<string, string | number>;
