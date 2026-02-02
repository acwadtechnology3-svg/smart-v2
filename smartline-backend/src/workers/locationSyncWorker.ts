import { Worker, Queue, QueueScheduler } from 'bullmq';
import redis from '../config/redis';
import { locationCache } from '../services/locationCache';
import { DriverRepository } from '../repositories/DriverRepository';
import { config } from '../config/env';

const driverRepo = new DriverRepository();

// Queue configuration
const queueName = 'location-sync';
const connection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
};

// Create queue
export const locationSyncQueue = new Queue(queueName, { connection });

// Create scheduler for delayed/repeatable jobs
const scheduler = new QueueScheduler(queueName, { connection });

/**
 * Location Sync Worker
 * Syncs location data from Redis cache to PostgreSQL database
 * Runs every 5 seconds to batch update driver locations
 */
export const locationSyncWorker = new Worker(
  queueName,
  async (job) => {
    try {
      console.log(`[LocationSync] Processing job ${job.id}`);

      // Get all online driver IDs from Redis
      const onlineDriverIds = await locationCache.getOnlineDriverIds();

      if (onlineDriverIds.length === 0) {
        console.log('[LocationSync] No online drivers to sync');
        return { synced: 0 };
      }

      console.log(`[LocationSync] Syncing ${onlineDriverIds.length} drivers`);

      let syncedCount = 0;
      let errorCount = 0;

      // Batch process driver locations
      for (const driverId of onlineDriverIds) {
        try {
          const location = await locationCache.getDriverLocation(driverId);

          if (location) {
            // Update PostgreSQL with latest location
            await driverRepo.updateLocation(
              driverId,
              location.lat,
              location.lng
            );
            syncedCount++;
          }
        } catch (error) {
          console.error(`[LocationSync] Failed to sync driver ${driverId}:`, error);
          errorCount++;
        }
      }

      console.log(
        `[LocationSync] Completed: ${syncedCount} synced, ${errorCount} errors`
      );

      return {
        synced: syncedCount,
        errors: errorCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[LocationSync] Worker error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Process one job at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // Per second
    },
  }
);

// Worker event handlers
locationSyncWorker.on('completed', (job, result) => {
  console.log(`[LocationSync] Job ${job.id} completed:`, result);
});

locationSyncWorker.on('failed', (job, error) => {
  console.error(`[LocationSync] Job ${job?.id} failed:`, error.message);
});

locationSyncWorker.on('error', (error) => {
  console.error('[LocationSync] Worker error:', error);
});

/**
 * Start location sync worker
 * Adds a repeatable job that runs every 5 seconds
 */
export async function startLocationSync() {
  try {
    // Remove any existing repeatable jobs
    const repeatableJobs = await locationSyncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await locationSyncQueue.removeRepeatableByKey(job.key);
    }

    // Add new repeatable job
    await locationSyncQueue.add(
      'sync-locations',
      {},
      {
        repeat: {
          every: 5000, // Every 5 seconds
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      }
    );

    console.log('✅ Location sync worker started (every 5 seconds)');
  } catch (error) {
    console.error('❌ Failed to start location sync worker:', error);
    throw error;
  }
}

/**
 * Stop location sync worker
 */
export async function stopLocationSync() {
  try {
    await locationSyncWorker.close();
    await locationSyncQueue.close();
    await scheduler.close();
    console.log('✅ Location sync worker stopped');
  } catch (error) {
    console.error('❌ Failed to stop location sync worker:', error);
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing location sync worker...');
  await stopLocationSync();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing location sync worker...');
  await stopLocationSync();
});
