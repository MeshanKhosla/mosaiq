import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import ReactECharts from 'echarts-for-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '~/components/theme-provider';

interface ChartProps {
  datasourceId: Id<'datasources'>;
}

export function Chart({ datasourceId }: ChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? 'hsl(220, 5%, 90%)' : 'hsl(240, 10%, 8%)';
  const labelColor = isDark ? 'hsl(220, 5%, 90%)' : 'hsl(240, 10%, 8%)';
  const borderColor = isDark ? 'hsl(220, 10%, 16%)' : 'hsl(240, 8%, 88%)';

  const { data: chartData } = useSuspenseQuery(
    convexQuery(api.datasources.getChartData, {
      datasourceId,
      groupBy: 'region',
      measures: [{ field: 'revenue', aggregation: 'SUM' }],
      orderBy: { field: 'revenue', direction: 'DESC' },
    }) as any,
  ) as {
    data: { labels: Array<string>; values: Array<number>; measureName: string };
  };

  if (chartData.labels.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No data available for chart
      </div>
    );
  }

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: chartData.measureName
        ? `Revenue by Region (${chartData.measureName})`
        : 'Revenue by Region',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: textColor,
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: isDark ? 'hsl(220, 12%, 11%)' : 'hsl(34, 10%, 97%)',
      borderColor: borderColor,
      textStyle: {
        color: textColor,
      },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const param = params[0];
        return `${param.name}<br/>${param.value.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chartData.labels,
      name: 'Region',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: {
        color: textColor,
      },
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
      axisTick: {
        lineStyle: {
          color: borderColor,
        },
      },
      axisLabel: {
        rotate: 0,
        color: textColor,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Revenue',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: {
        color: textColor,
      },
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
      axisTick: {
        lineStyle: {
          color: borderColor,
        },
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
          type: 'dashed',
        },
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => {
          return `$${value.toLocaleString()}`;
        },
      },
    },
    series: [
      {
        name: 'Revenue',
        type: 'bar',
        data: chartData.values,
        itemStyle: {
          color: '#3b82f6',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: labelColor,
          backgroundColor: 'transparent',
          borderWidth: 0,
          formatter: (params: { value: number }) => {
            return `$${params.value.toLocaleString()}`;
          },
        },
        emphasis: {
          itemStyle: {
            color: '#2563eb',
          },
        },
      },
    ],
  };

  return (
    <div className="w-full rounded-lg border bg-card p-6">
      <ReactECharts
        option={option}
        style={{ height: '400px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
