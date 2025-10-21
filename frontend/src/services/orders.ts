import { Order, OrdersParams } from '@/types/order';
import { StandardResponse } from '@/types/api';
import { apiRequest, buildQueryString } from './api-client';

export const ordersApi = {
  async listOrders(params: OrdersParams = {}): Promise<StandardResponse<Order[]>> {
    const queryString = buildQueryString(params);
    return apiRequest<Order[]>(`/orders${queryString}`);
  },

  async getOrder(orderID: string): Promise<StandardResponse<Order>> {
    return apiRequest<Order>(`/orders/${orderID}`);
  },
};
