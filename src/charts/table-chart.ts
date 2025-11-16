import type { Axes, ColorPalette } from '~/lib/types';
import type { ChartRequirements } from '~/charts/base-chart';
import type { Doc } from '../../convex/_generated/dataModel';
import BaseChart from '~/charts/base-chart';

type Column = Doc<'datasources'>['columns'][number];

class TableChart extends BaseChart {
  getDuckDbQuery(
    axes: Axes,
    columns: Array<Column>,
    tableName: string = 'data',
    filters?: Array<{
      columnId: string;
      selectedValues: Array<string | number>;
    }>,
  ): string {
    if (!axes || !axes.measures) {
      throw new Error('Axes must have measures');
    }

    const { dimensions = [], measures } = axes;

    if (measures.length === 0) {
      throw new Error('Table must have at least one measure');
    }

    const dimensionColumns = dimensions
      .map((id) => columns.find((col) => col._id === id))
      .filter((col): col is Column => col !== undefined);

    const measureData = measures
      .map((m) => {
        const columnId = typeof m === 'string' ? m : m.columnId;
        const aggregation = typeof m === 'string' ? 'SUM' : m.aggregation;
        const column = columns.find((col) => col._id === columnId);
        return { column, aggregation };
      })
      .filter(
        (m): m is { column: Column; aggregation: string } =>
          m.column !== undefined,
      );

    if (measureData.length === 0) {
      throw new Error('Measure columns not found');
    }

    const selectParts: Array<string> = [];

    dimensionColumns.forEach((col) => {
      const escapedName = this.escapeColumnName(col.name);
      selectParts.push(escapedName);
    });

    measureData.forEach(({ column, aggregation }) => {
      const escapedName = this.escapeColumnName(column.name);
      const aggregationExpr = this.buildAggregationExpression(
        column.name,
        aggregation,
        column.type,
      );
      selectParts.push(`${aggregationExpr} as ${escapedName}`);
    });

    const groupByParts = dimensionColumns.map((col) =>
      this.escapeColumnName(col.name),
    );

    const orderByParts: Array<string> = [];
    if (dimensionColumns.length > 0) {
      orderByParts.push(this.escapeColumnName(dimensionColumns[0].name));
      if (measureData.length > 0) {
        const firstMeasure = measureData[0];
        const aggregationExpr = this.buildAggregationExpression(
          firstMeasure.column.name,
          firstMeasure.aggregation,
          firstMeasure.column.type,
        );
        orderByParts.push(`${aggregationExpr} DESC`);
      }
    } else if (measureData.length > 0) {
      const firstMeasure = measureData[0];
      const aggregationExpr = this.buildAggregationExpression(
        firstMeasure.column.name,
        firstMeasure.aggregation,
        firstMeasure.column.type,
      );
      orderByParts.push(`${aggregationExpr} DESC`);
    }

    const escapedTableName = this.escapeColumnName(tableName);
    const selectClause = selectParts.join(', ');
    const whereClause = this.buildWhereClause(filters, columns);
    const groupByClause =
      groupByParts.length > 0 ? ` GROUP BY ${groupByParts.join(', ')}` : '';
    const orderByClause =
      orderByParts.length > 0 ? ` ORDER BY ${orderByParts.join(', ')}` : '';

    return `SELECT ${selectClause} FROM ${escapedTableName}${whereClause}${groupByClause}${orderByClause}`;
  }

  validateAxes(axes: Axes): true | string {
    const requirements = this.getRequirements();

    const dimensions = axes?.dimensions ?? [];
    const measures = axes?.measures ?? [];
    const dimCount = dimensions.length;
    const measureCount = measures.length;

    if (dimCount === 0 && measureCount === 0) {
      return `Required: Dimensions: ${requirements.wells.dimensions.min}-${requirements.wells.dimensions.max}, Measures: ${requirements.wells.measures.min}-${requirements.wells.measures.max}`;
    }

    if (
      dimCount < requirements.wells.dimensions.min ||
      dimCount > requirements.wells.dimensions.max
    ) {
      return `Table requires ${requirements.wells.dimensions.min}-${requirements.wells.dimensions.max} dimensions, but ${dimCount} provided`;
    }

    if (
      measureCount < requirements.wells.measures.min ||
      measureCount > requirements.wells.measures.max
    ) {
      return `Table requires ${requirements.wells.measures.min}-${requirements.wells.measures.max} measures, but ${measureCount} provided`;
    }

    return true;
  }

  getRequirements(): ChartRequirements {
    return {
      wells: {
        dimensions: {
          min: 0,
          max: 3,
        },
        measures: {
          min: 1,
          max: 3,
        },
      },
    };
  }

  getOptions(
    _axes: Axes,
    _labels: Array<string>,
    _values: Array<number>,
    _measureName: string,
    _dimensionName: string,
    _colors: ColorPalette,
    _width?: number,
    _height?: number,
  ): Record<string, any> {
    return {};
  }
}

export default TableChart;
