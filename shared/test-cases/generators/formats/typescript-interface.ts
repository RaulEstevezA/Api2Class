export interface Root {
  id: string;
  created_at: string;
  birthday: string;
  billing_address: Address;
  shipping_address: Address;
  payments: Payment[];
  metadata: Metadata;
}

export interface Address {
  street: string;
  city: string;
}

export interface Payment {
  amount: number;
  paid_at: string | null;
}

export interface Metadata {
  source: string;
}
