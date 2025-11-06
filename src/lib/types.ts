import type { Doc } from '../../convex/_generated/dataModel';

/**
 * Column type extracted from the Convex schema
 * This is the type of values in the columnTypes record
 */
export type ColumnType = NonNullable<Doc<'datasources'>['columnTypes']>[string];

/**
 * Data table row type extracted from the Convex schema
 * This is the type of individual items in the data array
 */
export type DataTableRow = NonNullable<Doc<'datasources'>['data']>[number];

/**
 * Aggregation types for measures in visuals
 */
export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE';

/**
 * Measure configuration with column and aggregation type
 */
export type MeasureConfig = {
  column: string;
  aggregation: AggregationType;
};

/**
 * Dimension configuration
 */
export type DimensionConfig = {
  column: string;
};

/**
 * Visual configuration matching Convex schema
 */
export type VisualConfig = {
  dimension?: string;
  measures?: Array<MeasureConfig>;
  columns?: Array<string>;
};

/**
 * Visual type from schema
 */
export type VisualType = Doc<'visuals'>['type'];

/**
 * Sheet document type
 */
export type Sheet = Doc<'sheets'>;

/**
 * Visual document type
 */
export type Visual = Doc<'visuals'>;
