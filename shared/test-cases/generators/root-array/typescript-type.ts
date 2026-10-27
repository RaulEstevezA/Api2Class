export type Root = {
  id: number;
  value: unknown;
  meta: Record<string, unknown>;
  matrix: number[][];
  points: Point[];
};

export type Point = {
  x: number;
  y: number;
};
