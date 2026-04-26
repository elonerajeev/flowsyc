/**
 * Query Limits - Enforce pagination on all database queries
 * Prevents database overload and improves performance
 */

export const QUERY_LIMITS = {
  // List endpoints
  LIST_DEFAULT: 50,
  LIST_MAX: 100,
  
  // Dashboard/analytics queries
  DASHBOARD_ITEMS: 500,
  ANALYTICS_ITEMS: 1200,
  
  // Background jobs
  AUTOMATION_BATCH: 100,
  SCHEDULED_JOBS: 50,
  
  // Real-time data
  ACTIVITY_FEED: 20,
  NOTIFICATIONS: 50,
  
  // Search results
  SEARCH_RESULTS: 50,
  
  // Bulk operations
  BULK_IMPORT: 1000,
  BULK_EXPORT: 5000,
} as const;

/**
 * Enforce limit on query
 * Usage: take: enforceLimit(query.limit)
 */
export function enforceLimit(requested?: number, max = QUERY_LIMITS.LIST_MAX): number {
  if (!requested || requested <= 0) return QUERY_LIMITS.LIST_DEFAULT;
  return Math.min(requested, max);
}
