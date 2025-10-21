import { DateRangeParams } from './api';

export interface Order {
  orderID: string;
  order_reference: string;
  order_date: string;
  greentree_id: string;
  clientID: string;
  contactID: string;

  customer: {
    contact_name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    account_name: string;
    account_code: string;
  };

  delivery: {
    name: string;
    company: string;
    street: string;
    city: string;
    country: string;
    phone: string;
  };

  items: Array<{
    product_code: string;
    description: string;
    unit_price: number;
    quantity: number;
    total_price: number;
  }>;

  totals: {
    subtotal: string;
    freight: string;
    freight_description: string;
    gst: string;
    total: string;
  };

  payment: {
    payment_type: string;
    transaction_id: string;
    amount: string;
  };

  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersParams extends DateRangeParams {
  limit?: number;
  minTotal?: string;
  maxTotal?: string;
  lastEvaluatedKey?: string | null;
}
