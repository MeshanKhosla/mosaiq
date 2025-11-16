import type BaseChart from '~/charts/base-chart';
import BarChart from '~/charts/bar-chart';
import PieChart from '~/charts/pie-chart';
import LineChart from '~/charts/line-chart';
import TableChart from '~/charts/table-chart';

export type VisualType = 'table' | 'bar_chart' | 'line_chart' | 'pie_chart';

export function getChartInstance(type: VisualType): BaseChart | null {
  switch (type) {
    case 'table':
      return new TableChart();
    case 'bar_chart':
      return new BarChart();
    case 'pie_chart':
      return new PieChart();
    case 'line_chart':
      return new LineChart();
    default:
      return new BarChart();
  }
}
