/**
 * Minimal in-memory TTL cache for expensive read endpoints.
 * No external dependencies — just a Map with expiry timestamps.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const cache = new TTLCache();

// TTLs
export const TTL = {
  GTM_OVERVIEW: 45_000,   // 45s — pages refetch every 60s, so always fresh
  LEADS_LIST:   20_000,   // 20s — staleTime on frontend is 30s
  SALES_METRICS: 30_000,  // 30s
  AUTOMATION_STATS: 55_000, // 55s — refetched every 60s
} as const;
