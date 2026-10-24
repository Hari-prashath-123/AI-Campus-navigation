/**
 * Common application types & utilities
 */

export type StatusState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: StatusState;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}
