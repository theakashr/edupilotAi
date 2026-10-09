/**
 * Generic Firestore operation result.
 * Used across all service functions to provide consistent error handling.
 */
export type DbResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Pagination cursor for Firestore queries.
 */
export interface PaginationOptions {
  limit?: number;
  startAfterDocId?: string;
}

/**
 * Standard paginated response.
 */
export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  lastDocId?: string;
}
