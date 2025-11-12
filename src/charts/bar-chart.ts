import type { Axes, ColorPalette } from '~/lib/types';
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

  getOptions(
    axes: Axes,
    labels: Array<string>,
    values: Array<number>,
    measureName: string,
    dimensionName: string,
    colors: ColorPalette,
  ): Record<string, any> {
    axes;
    const shouldRotate =
      labels.length > 12 || labels.some((s) => s.length > 12);
    return {
      backgroundColor: colors.backgroundColor,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
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
        left: '3%',
        right: '3%',
        bottom: shouldRotate ? 60 : 30,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: {
          alignWithLabel: true,
          lineStyle: { color: colors.borderColor },
        },
        axisLabel: { rotate: shouldRotate ? 30 : 0 },
        name: dimensionName + ' by ' + measureName,
        nameGap: 30,
        nameLocation: 'middle',
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
        },
        name: measureName,
        nameGap: 50,
        nameLocation: 'middle',
        nameTextStyle: {
          color: colors.textColor,
        },
      },
      series: [
        {
          name: measureName,
          type: 'bar',
          data: values,
          barMaxWidth: 40,
          itemStyle: { borderRadius: [4, 4, 0, 0], color: colors.seriesColor },
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

export default BarChart;
