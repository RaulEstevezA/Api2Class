export type Root = {
  id: string;
  created_at: string;
  birthday: string;
  billing_address: Address;
  shipping_address: Address;
  payments: Payment[];
  metadata: Metadata;
};

export type Address = {
  street: string;
  city: string;
};

export type Payment = {
  amount: number;
  paid_at: string | null;
};

export type Metadata = {
  source: string;
};
