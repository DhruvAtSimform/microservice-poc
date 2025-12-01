/**
 * Shared types used across the application
 */

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
