import type { Axes, ColorPalette } from '~/lib/types';
import type { ChartRequirements } from '~/charts/base-chart';
import type { Doc } from '../../convex/_generated/dataModel';
import BaseChart from '~/charts/base-chart';

type Column = Doc<'datasources'>['columns'][number];

class LineChart extends BaseChart {
  getDuckDbQuery(
    axes: Axes,
    columns: Array<Column>,
    tableName: string = 'data',
    filters?: Array<{
      columnId: string;
      selectedValues: Array<string | number>;
    }>,
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

    const whereClause = this.buildWhereClause(filters, columns);

    // Generate SQL query for line chart
    // SELECT dimension, SUM(measure) as value
    // FROM table
    // [WHERE filters]
    // GROUP BY dimension
    // ORDER BY dimension (for proper line continuity, especially for time-series)
    return `SELECT ${dimensionName}, SUM(${measureName}) as value FROM ${escapeColumnName(tableName)}${whereClause} GROUP BY ${dimensionName} ORDER BY ${dimensionName}`;
  }

  validateAxes(axes: Axes): true | string {
    const requirements = this.getRequirements();

    const dimensions = axes?.dimensions ?? [];
    const measures = axes?.measures ?? [];
    const dimCount = dimensions.length;
    const measureCount = measures.length;

    if (dimCount === 0 && measureCount === 0) {
      return `Required: Dimensions: ${requirements.wells.dimensions.min}, Measures: ${requirements.wells.measures.min}`;
    }

    if (
      dimCount < requirements.wells.dimensions.min ||
      dimCount > requirements.wells.dimensions.max
    ) {
      return `Line chart requires exactly ${requirements.wells.dimensions.min} dimension, but ${dimCount} provided`;
    }

    if (
      measureCount < requirements.wells.measures.min ||
      measureCount > requirements.wells.measures.max
    ) {
      return `Line chart requires exactly ${requirements.wells.measures.min} measure, but ${measureCount} provided`;
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

  getOptions(
    axes: Axes,
    labels: Array<string>,
    values: Array<number>,
    measureName: string,
    dimensionName: string,
    colors: ColorPalette,
    _width?: number,
    _height?: number,
  ): Record<string, any> {
    axes;

    return {
      backgroundColor: colors.backgroundColor,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.borderColor,
        textStyle: { color: colors.textColor },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          const v = Number(p.value);
          return `${p.name}<br/>${isFinite(v) ? v.toLocaleString() : '-'}`;
        },
      },
      transitionDuration: 0,
      showDelay: 0,
      hideDelay: 0,
      grid: {
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisTick: {
          alignWithLabel: true,
          lineStyle: { color: colors.borderColor },
        },
        axisLabel: {
          interval: 'auto',
          overflow: 'truncate',
        },
        name: dimensionName,
        nameLocation: 'middle', // Position at bottom center
        nameGap: 25, // Spacing between axis name and tick labels
        nameTextStyle: {
          color: colors.textColor,
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: colors.borderColor } },
        axisLabel: {
          formatter: (val: number) =>
            isFinite(val) ? val.toLocaleString() : '0',
          overflow: 'truncate',
        },
        name: measureName,
        nameLocation: 'middle', // Position on left side
        nameRotate: 90, // Rotate vertically
        nameGap: 50, // Spacing between axis name and tick labels (more for rotated text)
        nameTextStyle: {
          color: colors.textColor,
        },
      },
      series: [
        {
          name: measureName,
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: colors.seriesColor,
            width: 2,
          },
          itemStyle: {
            color: colors.seriesColor,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: colors.seriesColor + '80', // Add transparency
                },
                {
                  offset: 1,
                  color: colors.seriesColor + '00', // Fully transparent
                },
              ],
            },
          },
          emphasis: { focus: 'series' },
          label: {
            show: values.length <= 20,
            position: 'top',
            formatter: (p: { value: number }) =>
              isFinite(Number(p.value)) ? Number(p.value).toLocaleString() : '',
            color: colors.labelColor,
          },
        },
      ],
      animationDuration: 150,
      animationEasing: 'quartOut',
    };
  }
}

export default LineChart;
