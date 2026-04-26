import { logger } from "./logger";

/**
 * Enhanced Cache Provider Abstraction.
 * Supports in-memory storage today and Redis/Valkey for distributed caching.
 */

export interface CacheProvider {
  get<T>(key: string): T | null | Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): void | Promise<void>;
  invalidate(key: string): void | Promise<void>;
  invalidatePrefix(prefix: string): void | Promise<void>;
  invalidatePattern(pattern: string): void | Promise<void>;
  clear(): void | Promise<void>;
}

class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, { value: any; expiresAt: number | null }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

class ValkeyCacheProvider implements CacheProvider {
  private client: any;

  constructor(url: string) {
    try {
      const Redis = require("ioredis");
      this.client = new Redis(url, {
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
      });
      this.client.on("error", (err: any) => logger.error("Valkey/Redis Error:", err));
      this.client.on("connect", () => logger.info("Valkey/Redis Connected"));
    } catch (e) {
      logger.error("ioredis not found. Falling back to MemoryCache.");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (!this.client) return;
    const data = JSON.stringify(value);
    if (ttlMs) {
      await this.client.set(key, data, "PX", ttlMs);
    } else {
      await this.client.set(key, data);
    }
  }

  async invalidate(key: string): Promise<void> {
    if (this.client) await this.client.del(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (!this.client) return;
    const keys = await this.client.keys(`${prefix}*`);
    if (keys.length > 0) await this.client.del(...keys);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client) return;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) await this.client.del(...keys);
  }

  async clear(): Promise<void> {
    if (this.client) await this.client.flushall();
  }
}

// TTLs in Milliseconds
export const TTL = {
  SHORT: 60_000,
  MEDIUM: 300_000,
  LONG: 3600_000,
  GTM_OVERVIEW: 45_000,
  LEADS_LIST: 20_000,
  SALES_METRICS: 30_000,
  AUTOMATION_STATS: 55_000,
} as const;

function createCacheProvider(): CacheProvider {
  const redisUrl = process.env.VALKEY_URL || process.env.REDIS_URL;
  
  if (redisUrl) {
    logger.info("Cache: Initializing Valkey/Redis provider");
    return new ValkeyCacheProvider(redisUrl);
  }

  logger.info("Cache: Initializing In-Memory provider");
  return new MemoryCacheProvider();
}

export const cache = createCacheProvider();
