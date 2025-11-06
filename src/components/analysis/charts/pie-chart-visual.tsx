import { useQuery } from 'convex/react';
import ReactECharts from 'echarts-for-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useTheme } from '~/components/theme-provider';
import { Skeleton } from '~/components/ui/skeleton';

interface PieChartVisualProps {
  visualId: Id<'visuals'>;
}

export function PieChartVisual({ visualId }: PieChartVisualProps) {
  const { theme } = useTheme();
  const data = useQuery(api.visuals.getData, { visualId });

  const isDark = theme === 'dark';
  const textColor = isDark ? 'hsl(220, 5%, 90%)' : 'hsl(240, 10%, 8%)';

  if (data === undefined) {
    return <Skeleton className="w-full h-full" />;
  }

  if (
    data.type !== 'chart' ||
    data.labels.length === 0 ||
    data.datasets.length === 0
  ) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
        No data to display. Configure dimension and measure.
      </div>
    );
  }

  // Use first dataset for pie chart
  const dataset = data.datasets[0];
  if (dataset.values.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
        No measure configured.
      </div>
    );
  }

  const pieData = data.labels.map((label, index) => ({
    name: label,
    value: dataset.values[index] ?? 0,
  }));

  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];

  const option = {
    backgroundColor: 'transparent',
    color: colors,
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? 'hsl(220, 12%, 11%)' : 'hsl(34, 10%, 97%)',
      textStyle: {
        color: textColor,
      },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        color: textColor,
      },
      type: 'scroll',
    },
    series: [
      {
        name: dataset.name,
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: isDark ? 'hsl(220, 13%, 9%)' : 'hsl(34, 12%, 96%)',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: textColor,
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        labelLine: {
          show: false,
        },
        data: pieData,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
