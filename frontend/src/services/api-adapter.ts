import { StandardResponse } from '@/types/api';

/**
 * Adapts backend responses to a standard format
 * Backend returns: { success: true, orders: [...], count: 10 }
 * We want: { success: true, data: [...], meta: { count: 10 } }
 */
export function adaptResponse<T>(backendResponse: any): StandardResponse<T> {
  // Handle error responses
  if (!backendResponse.success && backendResponse.error) {
    return {
      success: false,
      data: null as any,
      error: backendResponse.error,
    };
  }

  // Extract data from various response shapes
  const data =
    backendResponse.orders ||
    backendResponse.customers ||
    backendResponse.overview ||
    backendResponse.order ||
    backendResponse.customer ||
    backendResponse.summary ||
    backendResponse.timeline ||
    backendResponse.topByRevenue ||
    backendResponse.topByQuantity ||
    backendResponse.data ||
    backendResponse;

  return {
    success: backendResponse.success ?? true,
    data: data,
    error: null,
    meta: {
      count: backendResponse.count,
      lastEvaluatedKey: backendResponse.lastEvaluatedKey,
      total: backendResponse.count, // Backend doesn't return total count yet
    },
  };
}
