export interface TrendDomain {
  min: number;
  max: number;
}

export function computeTrendDomain(values: number[]): TrendDomain {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min, max };
  const pad = (max - min) * 0.12;
  return { min: min - pad, max: max + pad };
}

export function trendValueToY(value: number, domain: TrendDomain): number {
  if (domain.min === domain.max) return 50;
  return 100 - ((value - domain.min) / (domain.max - domain.min)) * 100;
}

export function trendIndexToX(index: number, total: number): number {
  if (total <= 1) return 50;
  return (index / (total - 1)) * 100;
}

export interface TrendPoint {
  x: number;
  y: number;
  index: number;
}

export function buildTrendSegments(
  values: (number | null)[],
  domain: TrendDomain,
): TrendPoint[][] {
  const segments: TrendPoint[][] = [];
  let current: TrendPoint[] = [];

  values.forEach((value, index) => {
    if (value == null) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      return;
    }
    current.push({
      x: trendIndexToX(index, values.length),
      y: trendValueToY(value, domain),
      index,
    });
  });

  if (current.length > 0) segments.push(current);
  return segments;
}
