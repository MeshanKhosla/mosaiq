import type { Axes } from '~/lib/types';
import type { Doc } from '../../convex/_generated/dataModel';

export type ChartRequirements = {
  wells: {
    dimensions: {
      min: number;
      max: number;
    };
    measures: {
      min: number;
      max: number;
    };
  };
};

type Column = Doc<'datasources'>['columns'][number];

class BaseChart {
  /**
   * Get the requirements for the chart.
   * @returns The requirements for the chart.
   */
  getRequirements(): ChartRequirements {
    throw new Error('Not implemented');
  }

  /**
   * Get the DuckDB query for the chart.
   * @param axes - The axes of the chart.
   * @param columns - The columns from the datasource.
   * @param tableName - The name of the table to query.
   * @returns The DuckDB query.
   */
  getDuckDbQuery(
    axes: Axes,
    columns: Array<Column>,
    tableName?: string,
  ): string {
    axes;
    columns;
    tableName;
    throw new Error('Not implemented');
  }

  /**
   * Validate the axes of the chart such as the number of dimensions and measures.
   * @param axes - The axes of the chart.
   * @returns True if the axes are valid, an error message otherwise.
   */
  validateAxes(axes: Axes): true | string {
    axes;
    throw new Error('Not implemented');
  }
}

export default BaseChart;
