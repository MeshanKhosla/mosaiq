import ReactECharts from 'echarts-for-react';

interface ChartProps {
  options: Record<string, any>;
}

export function Chart({ options }: ChartProps) {
  return (
    <div className="w-full rounded-lg border bg-card p-6">
      <ReactECharts
        option={options}
        style={{ height: '400px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
