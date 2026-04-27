/**
 * Invalidates all dashboard and reports caches.
 * Called fire-and-forget after any mutation that affects dashboard data.
 */
import { cache } from "./cache";

export function invalidateDashboardCache(): void {
  // Non-blocking — dashboard cache miss just means a fresh DB query
  Promise.all([
    cache.invalidatePattern("dashboard:"),
    cache.invalidatePattern("reports:"),
    cache.invalidatePattern("alerts:"),
  ]).catch(() => {});
}
