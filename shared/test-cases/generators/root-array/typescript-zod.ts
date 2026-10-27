import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number(),
  y: z.number().int(),
});
export type Point = z.infer<typeof PointSchema>;

export const RootSchema = z.object({
  id: z.number().int(),
  value: z.unknown(),
  meta: z.record(z.string(), z.unknown()),
  matrix: z.array(z.array(z.number().int())),
  points: z.array(PointSchema),
});
export type Root = z.infer<typeof RootSchema>;
