import ReactECharts from 'echarts-for-react';

interface ChartProps {
  options: Record<string, any>;
  width?: number;
  height?: number;
}

export function Chart({ options, width, height }: ChartProps) {
  // Use full dimensions - ECharts grid handles spacing
  // Account for thin header (~28px)
  const chartWidth = width || '100%';
  const chartHeight = height ? Math.max(height - 28, 200) : 400;

  return (
    <div className="w-full h-full">
      <ReactECharts
        option={options}
        style={{
          height:
            typeof chartHeight === 'number' ? `${chartHeight}px` : chartHeight,
          width:
            typeof chartWidth === 'number' ? `${chartWidth}px` : chartWidth,
        }}
        opts={{ renderer: 'svg' }}
        notMerge={false}
        lazyUpdate={false}
      />
    </div>
  );
}
