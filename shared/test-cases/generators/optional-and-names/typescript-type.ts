export type Root = {
  users: User[];
};

export type User = {
  userId: number;
  email?: string;
  phone: string | null;
  "Postal Code": string;
  class: string;
  "2fa": boolean;
  tags: (string | null)[];
  deleted_at: null;
  manager?: Manager;
};

export type Manager = {
  user_id: number;
};
