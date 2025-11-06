import { useQuery } from 'convex/react';
import ReactECharts from 'echarts-for-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useTheme } from '~/components/theme-provider';
import { Skeleton } from '~/components/ui/skeleton';

interface LineChartVisualProps {
  visualId: Id<'visuals'>;
}

export function LineChartVisual({ visualId }: LineChartVisualProps) {
  const { theme } = useTheme();
  const data = useQuery(api.visuals.getData, { visualId });

  const isDark = theme === 'dark';
  const textColor = isDark ? 'hsl(220, 5%, 90%)' : 'hsl(240, 10%, 8%)';
  const borderColor = isDark ? 'hsl(220, 10%, 16%)' : 'hsl(240, 8%, 88%)';

  if (data === undefined) {
    return <Skeleton className="w-full h-full" />;
  }

  if (data.type !== 'chart' || data.labels.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
        No data to display. Configure dimension and measures.
      </div>
    );
  }

  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
  ];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'hsl(220, 12%, 11%)' : 'hsl(34, 10%, 97%)',
      borderColor: borderColor,
      textStyle: {
        color: textColor,
      },
    },
    legend: {
      show: data.datasets.length > 1,
      textStyle: {
        color: textColor,
      },
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: data.datasets.length > 1 ? '12%' : '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      boundaryGap: false,
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
        color: textColor,
        rotate: data.labels.length > 8 ? 45 : 0,
      },
    },
    yAxis: {
      type: 'value',
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
      },
    },
    series: data.datasets.map((dataset, index) => ({
      name: dataset.name,
      type: 'line',
      data: dataset.values,
      smooth: true,
      lineStyle: {
        width: 2,
        color: colors[index % colors.length],
      },
      itemStyle: {
        color: colors[index % colors.length],
      },
      areaStyle: {
        color: colors[index % colors.length],
        opacity: 0.1,
      },
      emphasis: {
        focus: 'series',
      },
    })),
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
