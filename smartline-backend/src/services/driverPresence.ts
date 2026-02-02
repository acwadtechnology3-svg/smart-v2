import redis from '../config/redis';
import { locationCache } from './locationCache';

const ONLINE_KEY_PREFIX = 'driver:';
const ONLINE_KEY_SUFFIX = ':online';
const PRESENCE_TTL = 30; // 30 seconds - driver must update within this time

/**
 * Driver Presence Service - Manages driver online/offline status
 * Uses Redis keys with TTL for automatic offline detection
 */
export class DriverPresenceService {
  /**
   * Mark driver as online
   * Refreshes TTL on each call
   */
  async setOnline(driverId: string): Promise<boolean> {
    try {
      const key = `${ONLINE_KEY_PREFIX}${driverId}${ONLINE_KEY_SUFFIX}`;
      await redis.set(key, '1', 'EX', PRESENCE_TTL);
      return true;
    } catch (error) {
      console.error('Failed to set driver online:', error);
      return false;
    }
  }

  /**
   * Explicitly mark driver as offline
   * Removes from location cache
   */
  async setOffline(driverId: string): Promise<boolean> {
    try {
      const key = `${ONLINE_KEY_PREFIX}${driverId}${ONLINE_KEY_SUFFIX}`;
      await redis.del(key);

      // Also remove from location cache
      await locationCache.removeDriver(driverId);

      return true;
    } catch (error) {
      console.error('Failed to set driver offline:', error);
      return false;
    }
  }

  /**
   * Check if driver is currently online
   */
  async isOnline(driverId: string): Promise<boolean> {
    try {
      const key = `${ONLINE_KEY_PREFIX}${driverId}${ONLINE_KEY_SUFFIX}`;
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Failed to check driver online status:', error);
      return false;
    }
  }

  /**
   * Get TTL remaining for driver's online status
   * Returns -1 if key doesn't exist or has no expiry
   */
  async getTimeRemaining(driverId: string): Promise<number> {
    try {
      const key = `${ONLINE_KEY_PREFIX}${driverId}${ONLINE_KEY_SUFFIX}`;
      const ttl = await redis.ttl(key);
      return ttl;
    } catch (error) {
      console.error('Failed to get TTL:', error);
      return -1;
    }
  }

  /**
   * Refresh driver's online TTL (extend online time)
   * Called on each location update
   */
  async refreshPresence(driverId: string): Promise<boolean> {
    try {
      const key = `${ONLINE_KEY_PREFIX}${driverId}${ONLINE_KEY_SUFFIX}`;
      const exists = await redis.exists(key);

      if (exists) {
        await redis.expire(key, PRESENCE_TTL);
        return true;
      }

      // If key doesn't exist, create it
      await this.setOnline(driverId);
      return true;
    } catch (error) {
      console.error('Failed to refresh presence:', error);
      return false;
    }
  }

  /**
   * Get count of currently online drivers
   */
  async getOnlineCount(): Promise<number> {
    try {
      const keys = await redis.keys(`${ONLINE_KEY_PREFIX}*${ONLINE_KEY_SUFFIX}`);
      return keys.length;
    } catch (error) {
      console.error('Failed to get online count:', error);
      return 0;
    }
  }

  /**
   * Get all online driver IDs
   */
  async getOnlineDriverIds(): Promise<string[]> {
    try {
      const keys = await redis.keys(`${ONLINE_KEY_PREFIX}*${ONLINE_KEY_SUFFIX}`);
      return keys.map(key =>
        key
          .replace(ONLINE_KEY_PREFIX, '')
          .replace(ONLINE_KEY_SUFFIX, '')
      );
    } catch (error) {
      console.error('Failed to get online driver IDs:', error);
      return [];
    }
  }

  /**
   * Batch check online status for multiple drivers
   */
  async areManyOnline(driverIds: string[]): Promise<Map<string, boolean>> {
    try {
      const pipeline = redis.pipeline();
      const statusMap = new Map<string, boolean>();

      for (const driverId of driverIds) {
        const key = `${ONLINE_KEY_PREFIX}${driverId}${ONLINE_KEY_SUFFIX}`;
        pipeline.exists(key);
      }

      const results = await pipeline.exec();

      if (results) {
        driverIds.forEach((driverId, index) => {
          const [err, exists] = results[index];
          statusMap.set(driverId, !err && exists === 1);
        });
      }

      return statusMap;
    } catch (error) {
      console.error('Failed to check multiple drivers:', error);
      return new Map();
    }
  }

  /**
   * Cleanup expired drivers from location cache
   * Should be called periodically by a background job
   */
  async cleanupStaleDrivers(): Promise<number> {
    try {
      return await locationCache.cleanupStaleDrivers();
    } catch (error) {
      console.error('Failed to cleanup stale drivers:', error);
      return 0;
    }
  }

  /**
   * Get presence statistics
   */
  async getStats() {
    try {
      const onlineCount = await this.getOnlineCount();
      const locationCount = await locationCache.getDriverCount();

      return {
        onlineDrivers: onlineCount,
        driversWithLocation: locationCount,
        presenceTTL: PRESENCE_TTL,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get presence stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const driverPresence = new DriverPresenceService();
