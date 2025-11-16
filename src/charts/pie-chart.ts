import type { Axes, ColorPalette } from '~/lib/types';
import type { ChartRequirements } from '~/charts/base-chart';
import type { Doc } from '../../convex/_generated/dataModel';
import BaseChart from '~/charts/base-chart';

type Column = Doc<'datasources'>['columns'][number];

class PieChart extends BaseChart {
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
    const measure = measures[0];
    const measureColumnId =
      typeof measure === 'string' ? measure : measure.columnId;
    const measureAggregation =
      typeof measure === 'string' ? 'SUM' : measure.aggregation;
    const measureColumn = columns.find((col) => col._id === measureColumnId);

    if (!dimensionColumn || !measureColumn) {
      throw new Error('Column not found');
    }

    const dimensionName = this.escapeColumnName(dimensionColumn.name);
    const aggregationExpr = this.buildAggregationExpression(
      measureColumn.name,
      measureAggregation,
      measureColumn.type,
    );

    const whereClause = this.buildWhereClause(filters, columns);

    // Generate SQL query for pie chart
    // SELECT dimension, AGG(measure) as value
    // FROM table
    // [WHERE filters]
    // GROUP BY dimension
    // ORDER BY value DESC
    return `SELECT ${dimensionName}, ${aggregationExpr} as value FROM ${this.escapeColumnName(tableName)}${whereClause} GROUP BY ${dimensionName} ORDER BY value DESC`;
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
      return `Pie chart requires exactly ${requirements.wells.dimensions.min} dimension, but ${dimCount} provided`;
    }

    if (
      measureCount < requirements.wells.measures.min ||
      measureCount > requirements.wells.measures.max
    ) {
      return `Pie chart requires exactly ${requirements.wells.measures.min} measure, but ${measureCount} provided`;
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
    width?: number,
    height?: number,
  ): Record<string, any> {
    axes;
    dimensionName;

    // Convert labels and values to ECharts pie chart data format
    const pieData = labels.map((label, index) => ({
      name: label,
      value: values[index] ?? 0,
    }));

    // Determine legend position based on chart size
    // For small charts, use bottom legend; for larger charts, use left vertical legend
    const isSmallChart = (width && width < 400) || (height && height < 300);
    const legendPosition = isSmallChart
      ? {
          orient: 'horizontal',
          left: 'center',
          bottom: '5%',
          textStyle: {
            color: colors.textColor,
          },
          itemGap: 10,
        }
      : {
          orient: 'vertical',
          left: 'left',
          top: 'middle',
          textStyle: {
            color: colors.textColor,
          },
          itemGap: 8,
        };

    // Adjust radius based on chart size and legend position
    const radius = isSmallChart
      ? ['30%', '60%'] // Smaller radius when legend is at bottom
      : ['40%', '70%']; // Larger radius when legend is on left

    return {
      backgroundColor: colors.backgroundColor,
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.borderColor,
        textStyle: { color: colors.textColor },
        formatter: (params: {
          name: string;
          value: number;
          percent: number;
        }) => {
          const v = Number(params.value);
          const total = values.reduce((sum, val) => sum + val, 0);
          const percent = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
          return `${params.name}<br/>${isFinite(v) ? v.toLocaleString() : '-'} (${percent}%)`;
        },
      },
      legend: legendPosition,
      series: [
        {
          name: measureName,
          type: 'pie',
          radius: radius,
          center: isSmallChart ? ['50%', '45%'] : ['60%', '50%'], // Adjust center when legend is at bottom
          avoidLabelOverlap: true, // Enable smart label positioning
          itemStyle: {
            borderRadius: 4,
            borderColor: colors.backgroundColor,
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: (params: { name: string; percent: number }) => {
              // Show shorter format for small slices to prevent overlap
              return params.percent > 3
                ? `${params.name}: ${params.percent.toFixed(1)}%`
                : `${params.percent.toFixed(1)}%`;
            },
            color: colors.labelColor,
            overflow: 'truncate',
            width: 80, // Limit label width
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
            lineStyle: {
              color: colors.borderColor,
            },
            // Hide label lines for very small slices
            showAbove: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          data: pieData,
        },
      ],
      animationDuration: 150,
      animationEasing: 'quartOut',
    };
  }
}

export default PieChart;
