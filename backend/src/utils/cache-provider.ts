import { logger } from "./logger";

export interface CacheProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSeconds?: number): void;
  delete(key: string): void;
  invalidatePrefix(prefix: string): void;
  invalidatePattern(pattern: string): void;
  clear(): void;
}

class MemoryCacheProvider implements CacheProvider {
  private cache = new Map<string, { value: any; expiresAt: number | null }>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Future Redis implementation
/*
class RedisCacheProvider implements CacheProvider {
  // ... redis implementation
}
*/

export const TTL = {
  SHORT: 60, // 1 min
  MEDIUM: 300, // 5 mins
  LONG: 3600, // 1 hour
  SALES_METRICS: 300,
  LEADS_LIST: 120,
  CLIENTS_LIST: 120,
};

function createCacheProvider(): CacheProvider {
  const useRedis = process.env.REDIS_ENABLED === "true";
  
  if (useRedis) {
    logger.info("Cache: Initializing Redis provider (staged)");
    // Return Memory for now until Redis is actually installed
    return new MemoryCacheProvider();
  }

  logger.info("Cache: Initializing In-Memory provider");
  return new MemoryCacheProvider();
}

export const cache = createCacheProvider();
