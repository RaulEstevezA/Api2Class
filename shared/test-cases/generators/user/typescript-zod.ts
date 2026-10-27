import { z } from 'zod';

export const AddressSchema = z.object({
  city: z.string(),
  postal_code: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

export const OrderSchema = z.object({
  id: z.number().int(),
  total: z.number(),
});
export type Order = z.infer<typeof OrderSchema>;

export const RootSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  active: z.boolean(),
  address: AddressSchema,
  orders: z.array(OrderSchema),
});
export type Root = z.infer<typeof RootSchema>;
