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
