import { z } from 'zod';

export const ManagerSchema = z.object({
  user_id: z.number().int(),
});
export type Manager = z.infer<typeof ManagerSchema>;

export const UserSchema = z.object({
  userId: z.number().int(),
  email: z.string().optional(),
  phone: z.string().nullable(),
  "Postal Code": z.string(),
  class: z.string(),
  "2fa": z.boolean(),
  tags: z.array(z.string().nullable()),
  deleted_at: z.null(),
  manager: ManagerSchema.optional(),
});
export type User = z.infer<typeof UserSchema>;

export const RootSchema = z.object({
  users: z.array(UserSchema),
});
export type Root = z.infer<typeof RootSchema>;
