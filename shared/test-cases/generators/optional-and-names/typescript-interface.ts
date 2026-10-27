export interface Root {
  users: User[];
}

export interface User {
  userId: number;
  email?: string;
  phone: string | null;
  "Postal Code": string;
  class: string;
  "2fa": boolean;
  tags: (string | null)[];
  deleted_at: null;
  manager?: Manager;
}

export interface Manager {
  user_id: number;
}
