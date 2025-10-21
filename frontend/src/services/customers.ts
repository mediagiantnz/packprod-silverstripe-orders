import { Customer, CustomersParams } from '@/types/customer';
import { Order } from '@/types/order';
import { StandardResponse } from '@/types/api';
import { apiRequest, buildQueryString } from './api-client';

export const customersApi = {
  async listCustomers(params: CustomersParams = {}): Promise<StandardResponse<Customer[]>> {
    const queryString = buildQueryString(params);
    return apiRequest<Customer[]>(`/customers${queryString}`);
  },

  async getCustomer(contactID: string): Promise<StandardResponse<Customer>> {
    return apiRequest<Customer>(`/customers/${contactID}`);
  },

  async getCustomerOrders(contactID: string, params: CustomersParams = {}): Promise<StandardResponse<Order[]>> {
    const queryString = buildQueryString(params);
    return apiRequest<Order[]>(`/customers/${contactID}/orders${queryString}`);
  },
};
