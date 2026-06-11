import { describe, expect, it } from 'vitest';
import { buildMonthlyChartSeries } from './dashboard-monthly-series';

describe('buildMonthlyChartSeries', () => {
  it('aggregates rows by month', () => {
    const series = buildMonthlyChartSeries({
      year: 2026,
      rows: [
        { month: 1, totalAmount: 100, outstanding: 10 },
        { month: 1, totalAmount: 50, outstanding: 5 },
        { month: 3, totalAmount: 200, outstanding: 0 },
      ],
    });

    expect(series).toHaveLength(12);
    expect(series[0]?.totalAmount).toBe(150);
    expect(series[0]?.outstanding).toBe(15);
    expect(series[2]?.totalAmount).toBe(200);
    expect(series[1]?.totalAmount).toBe(0);
  });
});
