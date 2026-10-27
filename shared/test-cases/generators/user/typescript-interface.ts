export interface Root {
  id: number;
  name: string;
  active: boolean;
  address: Address;
  orders: Order[];
}

export interface Address {
  city: string;
  postal_code: string;
}

export interface Order {
  id: number;
  total: number;
}
