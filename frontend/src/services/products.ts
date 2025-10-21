import { Product, ProductListResponse } from '@/types/product';
import { StandardResponse } from '@/types/api';
import { apiRequest, buildQueryString } from './api-client';

export const productsApi = {
  async listProducts(params?: { 
    startDate?: string; 
    endDate?: string;
    limit?: number;
    lastEvaluatedKey?: string;
    search?: string;
  }): Promise<StandardResponse<ProductListResponse>> {
    const queryString = params ? buildQueryString(params) : '';
    return apiRequest<ProductListResponse>(`/products${queryString}`);
  },
};
