export interface SizeDefinition {
  label: string;
  minPoints: number;
  maxPoints: number;
  weeksReference: string;
  weight: number;
}

export interface ThirdsBreakdown {
  low: number;
  mid: number;
  high: number;
}

export function calculateThirds(min: number, max: number): ThirdsBreakdown {
  const range = max - min;
  const bandSize = range / 3;

  const lowMid = min + bandSize / 2;
  const midMid = min + bandSize + bandSize / 2;
  const highMid = min + 2 * bandSize + bandSize / 2;

  return {
    low: Math.ceil(lowMid),
    mid: Math.ceil(midMid),
    high: Math.ceil(highMid),
  };
}
