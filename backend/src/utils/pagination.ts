/**
 * Shared utility to enforce strict pagination limits across the entire API.
 * This prevents "Data Dump" attacks and reduces database load.
 */

export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function normalizePagination(params: PaginationParams): NormalizedPagination {
  const rawPage = Number(params.page);
  const rawLimit = Number(params.limit);

  const page = !Number.isNaN(rawPage) && rawPage > 0 ? rawPage : 1;
  
  // Enforce a strict maximum limit of 100
  let limit = !Number.isNaN(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
