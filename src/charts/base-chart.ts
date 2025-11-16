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

export type Filter = {
  columnId: string;
  selectedValues: Array<string | number>;
};

class BaseChart {
  /**
   * Get the requirements for the chart.
   * @returns The requirements for the chart.
   */
  getRequirements(): ChartRequirements {
    throw new Error('Not implemented');
  }

  /**
   * Escape column names for SQL queries.
   */
  escapeColumnName(name: string): string {
    if (
      /[^a-zA-Z0-9_]/.test(name) ||
      /^\d/.test(name) ||
      ['select', 'from', 'where', 'group', 'order', 'by', 'as'].includes(
        name.toLowerCase(),
      )
    ) {
      return `"${name.replace(/"/g, '""')}"`;
    }
    return name;
  }

  /**
   * Build an aggregation SQL expression.
   * @param columnName - The column name (not escaped, will be escaped here)
   * @param aggregation - The aggregation type (SUM, AVG, COUNT, MIN, MAX, COUNT_DISTINCT, MEDIAN)
   * @param columnType - The column type to validate aggregation compatibility
   * @returns SQL aggregation expression
   */
  buildAggregationExpression(
    columnName: string,
    aggregation: string,
    columnType?: 'string' | 'number' | 'date',
  ): string {
    const escapedColumn = this.escapeColumnName(columnName);
    const aggUpper = aggregation.toUpperCase();

    const numericOnlyAggregations = ['SUM', 'AVG', 'MIN', 'MAX', 'MEDIAN'];
    if (
      columnType &&
      columnType !== 'number' &&
      numericOnlyAggregations.includes(aggUpper)
    ) {
      return `COUNT(${escapedColumn})`;
    }

    switch (aggUpper) {
      case 'SUM':
        return `SUM(${escapedColumn})`;
      case 'AVG':
        return `AVG(${escapedColumn})`;
      case 'COUNT':
        return `COUNT(${escapedColumn})`;
      case 'MIN':
        return `MIN(${escapedColumn})`;
      case 'MAX':
        return `MAX(${escapedColumn})`;
      case 'COUNT_DISTINCT':
        return `COUNT(DISTINCT ${escapedColumn})`;
      case 'MEDIAN':
        return `MEDIAN(${escapedColumn})`;
      default:
        return `COUNT(${escapedColumn})`;
    }
  }

  /**
   * Build a WHERE clause from filters.
   * @param filters - Array of filter objects
   * @param columns - The columns from the datasource
   * @returns WHERE clause string or empty string if no filters
   */
  buildWhereClause(
    filters: Array<Filter> | undefined,
    columns: Array<Column>,
  ): string {
    if (!filters || filters.length === 0) {
      return '';
    }

    const escapeValue = (value: string | number): string => {
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    };

    const conditions: Array<string> = [];

    for (const filter of filters) {
      if (filter.selectedValues.length === 0) {
        continue;
      }

      const column = columns.find((col) => col._id === filter.columnId);
      if (!column) {
        continue;
      }

      const columnName = this.escapeColumnName(column.name);
      const values = filter.selectedValues.map(escapeValue).join(', ');
      conditions.push(`${columnName} IN (${values})`);
    }

    if (conditions.length === 0) {
      return '';
    }

    return ` WHERE ${conditions.join(' AND ')}`;
  }

  /**
   * Get the DuckDB query for the chart.
   * @param axes - The axes of the chart.
   * @param columns - The columns from the datasource.
   * @param tableName - The name of the table to query.
   * @param filters - Optional filters to apply to the query.
   * @returns The DuckDB query.
   */
  getDuckDbQuery(
    axes: Axes,
    columns: Array<Column>,
    tableName?: string,
    filters?: Array<Filter>,
  ): string {
    axes;
    columns;
    tableName;
    filters;
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
