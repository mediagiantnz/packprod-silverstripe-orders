export interface DashboardOverview {
  today: MetricPeriod;
  this_week: MetricPeriod;
  this_month: MetricPeriod;
  total_customers: number;
}

export interface MetricPeriod {
  order_count: number;
  revenue: string;
  avg_order_value: string;
}

export interface ProductAnalytics {
  product_code: string;
  description: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
}

export interface ProductReport {
  summary: {
    total_products: number;
    total_orders_analyzed: number;
  };
  topByRevenue: ProductAnalytics[];
  topByQuantity: ProductAnalytics[];
}

export interface SalesTimeline {
  date: string;
  revenue: number;
  order_count: number;
}

export interface SalesReport {
  summary: {
    total_revenue: string;
    total_orders: number;
    average_order_value: string;
  };
  timeline: SalesTimeline[];
}

export type GroupByPeriod = 'day' | 'week' | 'month';
