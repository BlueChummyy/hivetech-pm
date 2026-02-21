export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

export function errorResponse(error: {
  code: string;
  message: string;
  details?: unknown;
}): ApiErrorResponse {
  return {
    success: false,
    error,
  };
}

export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
): ApiSuccessResponse<T[]> {
  return {
    success: true,
    data,
    meta: { pagination },
  };
}
