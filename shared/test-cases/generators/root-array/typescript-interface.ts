export interface Root {
  id: number;
  value: unknown;
  meta: Meta;
  matrix: number[][];
  points: Point[];
}

export interface Meta {}

export interface Point {
  x: number;
  y: number;
}
