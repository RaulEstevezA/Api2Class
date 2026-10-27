import { z } from 'zod';

export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

export const PaymentSchema = z.object({
  amount: z.number(),
  paid_at: z.iso.datetime({ offset: true }).nullable(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const MetadataSchema = z.object({
  source: z.string(),
});
export type Metadata = z.infer<typeof MetadataSchema>;

export const RootSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  birthday: z.iso.date(),
  billing_address: AddressSchema,
  shipping_address: AddressSchema,
  payments: z.array(PaymentSchema),
  metadata: MetadataSchema,
});
export type Root = z.infer<typeof RootSchema>;
