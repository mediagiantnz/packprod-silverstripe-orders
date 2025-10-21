export interface Product {
  product_code: string;
  description: string;
  total_quantity?: number;
  total_revenue?: number;
  order_count?: number;
  last_ordered?: string;
}

export interface ProductListResponse {
  products: Product[];
  lastEvaluatedKey?: {
    product_code: string;
  };
}
