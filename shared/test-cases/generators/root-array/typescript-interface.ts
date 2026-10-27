export interface Root {
  id: number;
  value: unknown;
  meta: Record<string, unknown>;
  matrix: number[][];
  points: Point[];
}

export interface Point {
  x: number;
  y: number;
}
