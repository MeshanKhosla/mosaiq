import type { Axes, ColorPalette } from '~/lib/types';
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

  /**
   * Gets the input to the Echarts options prop
   */
  getOptions(
    axes: Axes,
    labels: Array<string>,
    values: Array<number>,
    measureName: string,
    dimensionName: string,
    colors: ColorPalette,
    width?: number,
    height?: number,
  ): Record<string, any> {
    axes;
    labels;
    values;
    measureName;
    dimensionName;
    colors;
    width;
    height;
    throw new Error('Not implemented');
  }

  /**
   * Optional method to calculate grid padding dynamically.
   * Subclasses can override this to provide custom padding calculations.
   * @param labels - Array of label strings
   * @param values - Array of numeric values
   * @param measureName - Name of the measure
   * @param dimensionName - Name of the dimension
   * @param width - Chart width
   * @param height - Chart height
   * @returns Grid padding configuration object
   */
  calculateGridPadding(
    labels: Array<string>,
    values: Array<number>,
    measureName: string,
    dimensionName: string,
    width?: number,
    height?: number,
  ): {
    left: string;
    right: string;
    top: string;
    bottom: string;
  } {
    labels;
    values;
    measureName;
    dimensionName;
    width;
    height;
    // Default implementation returns standard padding
    // Subclasses should override for custom behavior
    return {
      left: '60px',
      right: '5%',
      top: '10%',
      bottom: '15%',
    };
  }
}

export default BaseChart;
