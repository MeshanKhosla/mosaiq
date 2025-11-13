import ReactECharts from 'echarts-for-react';

interface ChartProps {
  options: Record<string, any>;
  width?: number;
  height?: number;
}

export function Chart({ options, width, height }: ChartProps) {
  // Calculate chart dimensions, accounting for padding
  const chartWidth = width ? width - 48 : undefined; // 24px padding on each side
  const chartHeight = height ? height - 120 : 400; // Account for header (48px) + padding (48px) + some margin

  return (
    <div className="w-full rounded-lg border bg-card p-6">
      <ReactECharts
        option={options}
        style={{
          height: `${chartHeight}px`,
          width: chartWidth ? `${chartWidth}px` : '100%',
        }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
