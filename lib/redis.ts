import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

/**
 * Phase 41: Industrial Redis Client
 * Fallback to a mock-proxy if REDIS_URL is not provided (Sovereign Mode).
 */
class RedisClient {
  private client: Redis | null = null;

  constructor() {
    if (REDIS_URL) {
      try {
        this.client = new Redis(REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            return Math.min(times * 50, 2000);
          },
        });

        this.client.on("error", (err) => {
          console.warn("[REDIS-ERROR] Client disconnected or failed", err);
        });
      } catch (err) {
        console.warn("[REDIS-INIT-FAILED]", err);
      }
    } else {
      console.info("[REDIS-SOVEREIGN-MODE] REDIS_URL missing, internal memory cache will be used.");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // Fail silently for performance
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Fail silently
    }
  }
}

export const redis = new RedisClient();
