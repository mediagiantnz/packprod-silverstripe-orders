export interface StandardResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  meta?: {
    count?: number;
    lastEvaluatedKey?: string;
    limit?: number;
    total?: number;
  };
}

export interface PaginationParams {
  limit?: number;
  lastEvaluatedKey?: string | null;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}
