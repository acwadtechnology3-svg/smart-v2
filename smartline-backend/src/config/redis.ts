import Redis from 'ioredis';
import { config } from './env';
import { Worker, Queue } from 'bullmq';

// Redis connection configuration
const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Disable retries to prevent spam
  lazyConnect: true, // Don't connect until first command
  retryStrategy(times: number) {
    // Stop retrying after 3 attempts
    if (times > 3) {
      console.warn('⚠️  Redis unavailable - Running without Redis');
      return null; // Stop retrying
    }
    return Math.min(times * 1000, 3000);
  },
  reconnectOnError() {
    return false; // Don't auto-reconnect on errors
  },
};

// Create Redis client instance
export const redis = config.REDIS_URL ? new Redis(config.REDIS_URL) : new Redis(redisConfig);

// Redis event handlers (disabled to reduce console noise when Redis is unavailable)
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redis.on('error', (err) => {
  // Only log once, not on every retry
  if (!redis.status || redis.status === 'end') {
    console.warn('⚠️  Redis unavailable - Running without Redis (location features disabled)');
  }
});

// Disable noisy reconnection logs
// redis.on('close', () => { ... });
// redis.on('reconnecting', () => { ... });

// Health check function
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Get Redis info
export async function getRedisInfo() {
  try {
    const info = await redis.info('stats');
    const memory = await redis.info('memory');
    return { stats: info, memory };
  } catch (error) {
    console.error('Failed to get Redis info:', error);
    return null;
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  await redis.quit();
  console.log('Redis connection closed gracefully');
}

// Helper: Set with expiration
export async function setWithExpiry(
  key: string,
  value: string,
  expirySeconds: number
): Promise<void> {
  await redis.setex(key, expirySeconds, value);
}

// Helper: Get and parse JSON
export async function getJSON<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Helper: Set JSON with expiration
export async function setJSON(
  key: string,
  value: any,
  expirySeconds?: number
): Promise<void> {
  const json = JSON.stringify(value);
  if (expirySeconds) {
    await redis.setex(key, expirySeconds, json);
  } else {
    await redis.set(key, json);
  }
}

export default redis;
