import { API_BASE_URL, API_CONFIG } from '@/config/api';
import { StandardResponse } from '@/types/api';
import { adaptResponse } from './api-adapter';

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<StandardResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        ...API_CONFIG.headers,
        ...options?.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return adaptResponse<T>(json);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API Request failed:', error);
    
    return {
      success: false,
      data: null as any,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}
