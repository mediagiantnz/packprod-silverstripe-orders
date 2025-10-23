export interface Product {
  product_code: string;
  description: string;
  total_quantity?: number;
  total_revenue?: number;
  order_count?: number;
  last_ordered?: string;
  category?: string;
}

export interface ProductListResponse {
  products: Product[];
  lastEvaluatedKey?: {
    product_code: string;
  };
}

export interface ProductOrderCustomer {
  contactID: string;
  contact_name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  account_name: string;
  account_code: string;
}

export interface ProductOrderItem {
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ProductOrder {
  orderID: string;
  order_reference: string;
  order_date: string;
  createdAt: string;
  status: string;
  customer: ProductOrderCustomer;
  productItem: ProductOrderItem;
}

export interface ProductOrdersSummary {
  totalOrders: number;
  uniqueCustomers: number;
  totalQuantitySold: number;
  totalRevenue: string;
  avgQuantityPerOrder: string;
}

export interface ProductOrdersData {
  productCode: string;
  category: string;
  summary: ProductOrdersSummary;
  orders: ProductOrder[];
}

export interface ProductOrdersResponse {
  productCode: string;
  category: string;
  summary: ProductOrdersSummary;
  orders: ProductOrder[];
}
