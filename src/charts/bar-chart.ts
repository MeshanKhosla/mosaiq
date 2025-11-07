import type { Axes } from '~/lib/types';
import type { ChartRequirements } from '~/charts/base-chart';
import BaseChart from '~/charts/base-chart';

class BarChart extends BaseChart {
  getDuckDbQuery(axes: Axes) {
    // TODO: Implement
    return ``;
  }

  validateAxes(axes: Axes) {
    // TODO: Implement
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
}
