import type { Axes } from '~/lib/types';
import type { ChartRequirements } from '~/charts/base-chart';
import type { Doc } from '../../convex/_generated/dataModel';
import BaseChart from '~/charts/base-chart';

type Column = Doc<'datasources'>['columns'][number];

class BarChart extends BaseChart {
  getDuckDbQuery(
    axes: Axes,
    columns: Array<Column>,
    tableName: string = 'data',
  ): string {
    if (!axes || !axes.dimensions || !axes.measures) {
      throw new Error('Axes must have dimensions and measures');
    }

    const { dimensions, measures } = axes;

    if (dimensions.length === 0 || measures.length === 0) {
      throw new Error('Axes must have at least one dimension and one measure');
    }

    // Map column IDs to column names
    const dimensionColumn = columns.find((col) => col._id === dimensions[0]);
    const measureColumn = columns.find((col) => col._id === measures[0]);

    if (!dimensionColumn || !measureColumn) {
      throw new Error('Column not found');
    }

    // Escape column names with double quotes if they contain special characters
    const escapeColumnName = (name: string): string => {
      // If name contains spaces, special characters, or is a reserved word, quote it
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
    };

    const dimensionName = escapeColumnName(dimensionColumn.name);
    const measureName = escapeColumnName(measureColumn.name);

    // Generate SQL query for bar chart
    // SELECT dimension, SUM(measure) as value
    // FROM table
    // GROUP BY dimension
    // ORDER BY value DESC
    return `SELECT ${dimensionName}, SUM(${measureName}) as value FROM ${escapeColumnName(tableName)} GROUP BY ${dimensionName} ORDER BY value DESC`;
  }

  validateAxes(axes: Axes): true | string {
    const requirements = this.getRequirements();

    if (!axes) {
      return 'Axes are required';
    }

    const dimensions = axes.dimensions ?? [];
    const measures = axes.measures ?? [];

    const dimCount = dimensions.length;
    const measureCount = measures.length;

    if (
      dimCount < requirements.wells.dimensions.min ||
      dimCount > requirements.wells.dimensions.max
    ) {
      return `Bar chart requires exactly ${requirements.wells.dimensions.min} dimension, but ${dimCount} provided`;
    }

    if (
      measureCount < requirements.wells.measures.min ||
      measureCount > requirements.wells.measures.max
    ) {
      return `Bar chart requires exactly ${requirements.wells.measures.min} measure, but ${measureCount} provided`;
    }

    return true;
  }

  getRequirements(): ChartRequirements {
    return {
      wells: {
        dimensions: {
          min: 1,
          max: 1,
        },
        measures: {
          min: 1,
          max: 1,
        },
      },
    };
  }
}

export default BarChart;
