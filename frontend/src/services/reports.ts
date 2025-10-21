import { DashboardOverview, ProductReport, SalesReport, GroupByPeriod } from '@/types/reports';
import { Order } from '@/types/order';
import { StandardResponse } from '@/types/api';
import { apiRequest, buildQueryString } from './api-client';

interface OverviewResponse {
  overview: DashboardOverview;
  recent_orders: Order[];
}

export const reportsApi = {
  async getOverview(): Promise<StandardResponse<OverviewResponse>> {
    return apiRequest<OverviewResponse>('/reports/overview');
  },

  async getProductReport(params?: { startDate?: string; endDate?: string }): Promise<StandardResponse<ProductReport>> {
    const queryString = params ? buildQueryString(params) : '';
    return apiRequest<ProductReport>(`/reports/products${queryString}`);
  },

  async getSalesReport(params?: { startDate?: string; endDate?: string; groupBy?: GroupByPeriod }): Promise<StandardResponse<SalesReport>> {
    const queryString = params ? buildQueryString(params) : '';
    return apiRequest<SalesReport>(`/reports/sales${queryString}`);
  },
};
