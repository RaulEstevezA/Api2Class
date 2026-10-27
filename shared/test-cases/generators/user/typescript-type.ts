export type Root = {
  id: number;
  name: string;
  active: boolean;
  address: Address;
  orders: Order[];
};

export type Address = {
  city: string;
  postal_code: string;
};

export type Order = {
  id: number;
  total: number;
};
