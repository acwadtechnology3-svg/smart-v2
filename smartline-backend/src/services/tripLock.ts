import Redlock from 'redlock';
import redis from '../config/redis';

// Create Redlock instance
const redlock = new Redlock(
  [redis], // Array of Redis clients
  {
    driftFactor: 0.01, // Expected clock drift
    retryCount: 3, // Number of times to retry
    retryDelay: 200, // Time in ms between retries
    retryJitter: 200, // Random time to add to retries
    automaticExtensionThreshold: 500, // Extend lock if TTL < this value (ms)
  }
);

// Handle Redlock errors
redlock.on('error', (error) => {
  console.error('Redlock error:', error);
});

/**
 * Trip Lock Service - Distributed locking to prevent race conditions
 * Prevents multiple drivers from accepting the same trip simultaneously
 */
export class TripLockService {
  private readonly LOCK_TTL = 5000; // 5 seconds

  /**
   * Acquire lock on a trip
   * Prevents concurrent acceptance by multiple drivers
   */
  async lockTrip(tripId: string): Promise<any> {
    try {
      const lock = await redlock.acquire([`lock:trip:${tripId}`], this.LOCK_TTL);
      return lock;
    } catch (error: any) {
      if (error.message?.includes('unable to acquire lock')) {
        throw new Error('Trip is being processed by another driver');
      }
      throw error;
    }
  }

  /**
   * Acquire lock on a driver
   * Prevents driver from accepting multiple trips simultaneously
   */
  async lockDriver(driverId: string): Promise<any> {
    try {
      const lock = await redlock.acquire(
        [`lock:driver:${driverId}`],
        this.LOCK_TTL
      );
      return lock;
    } catch (error: any) {
      if (error.message?.includes('unable to acquire lock')) {
        throw new Error('Driver is processing another trip');
      }
      throw error;
    }
  }

  /**
   * Acquire both trip and driver locks atomically
   * Returns both locks or throws error
   */
  async lockTripAndDriver(
    tripId: string,
    driverId: string
  ): Promise<{ tripLock: any; driverLock: any }> {
    let tripLock = null;
    let driverLock = null;

    try {
      // Acquire trip lock first
      tripLock = await this.lockTrip(tripId);

      // Then acquire driver lock
      driverLock = await this.lockDriver(driverId);

      return { tripLock, driverLock };
    } catch (error) {
      // Release trip lock if driver lock fails
      if (tripLock) {
        await this.releaseLock(tripLock);
      }
      throw error;
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(lock: any): Promise<void> {
    try {
      await lock.release();
    } catch (error) {
      console.error('Error releasing lock:', error);
      // Lock will expire automatically, so non-critical error
    }
  }

  /**
   * Release multiple locks
   */
  async releaseLocks(locks: any[]): Promise<void> {
    await Promise.all(locks.map((lock) => this.releaseLock(lock)));
  }

  /**
   * Execute function with trip lock
   */
  async withTripLock<T>(
    tripId: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const lock = await this.lockTrip(tripId);
    try {
      return await callback();
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Execute function with driver lock
   */
  async withDriverLock<T>(
    driverId: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const lock = await this.lockDriver(driverId);
    try {
      return await callback();
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Execute function with both trip and driver locks
   */
  async withTripAndDriverLock<T>(
    tripId: string,
    driverId: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const { tripLock, driverLock } = await this.lockTripAndDriver(
      tripId,
      driverId
    );

    try {
      return await callback();
    } finally {
      await this.releaseLocks([tripLock, driverLock]);
    }
  }

  /**
   * Try to acquire lock without throwing error
   * Returns lock on success, null on failure
   */
  async tryLockTrip(tripId: string): Promise<any | null> {
    try {
      return await this.lockTrip(tripId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if trip is currently locked
   */
  async isTripLocked(tripId: string): Promise<boolean> {
    try {
      const lock = await this.tryLockTrip(tripId);
      if (lock) {
        await this.releaseLock(lock);
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extend lock TTL (useful for long-running operations)
   */
  async extendLock(lock: any, extensionMs: number): Promise<void> {
    try {
      await lock.extend(extensionMs);
    } catch (error) {
      console.error('Error extending lock:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tripLock = new TripLockService();
