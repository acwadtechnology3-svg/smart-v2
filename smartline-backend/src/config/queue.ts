import { Queue, QueueOptions, ConnectionOptions } from 'bullmq';
import { config } from './env';

// Note: Redis version patch is applied in redis-patch.ts (imported in index.ts)

const connection: ConnectionOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};


// Default queue options
const defaultOptions: QueueOptions = {
  connection, // Use connection options, let BullMQ create instances (which will be patched)
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 1 day
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000, // Keep last 5000 failed jobs
    },
  },
};

/**
 * Queue definitions
 */
export const QUEUE_NAMES = {
  LOCATION_SYNC: 'location-sync',
  NOTIFICATIONS: 'notifications',
  TRIP_EVENTS: 'trip-events',
  PAYMENT_PROCESSING: 'payment-processing',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup',
  EMAIL: 'email',
  SMS: 'sms',
} as const;

/**
 * Create queue instances
 */
export const queues = {
  locationSync: new Queue(QUEUE_NAMES.LOCATION_SYNC, defaultOptions),
  notifications: new Queue(QUEUE_NAMES.NOTIFICATIONS, {
    ...defaultOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      attempts: 5, // More retries for critical notifications
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  }),
  tripEvents: new Queue(QUEUE_NAMES.TRIP_EVENTS, defaultOptions),
  paymentProcessing: new Queue(QUEUE_NAMES.PAYMENT_PROCESSING, {
    ...defaultOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      attempts: 5, // Critical - more retries
      // timeout: 30000,
    },
  }),
  analytics: new Queue(QUEUE_NAMES.ANALYTICS, {
    ...defaultOptions,
    defaultJobOptions: {
      ...defaultOptions.defaultJobOptions,
      attempts: 1, // Don't retry analytics
      removeOnComplete: true, // Remove immediately
    },
  }),
  cleanup: new Queue(QUEUE_NAMES.CLEANUP, defaultOptions),
  email: new Queue(QUEUE_NAMES.EMAIL, defaultOptions),
  sms: new Queue(QUEUE_NAMES.SMS, defaultOptions),
};

/**
 * Job priorities
 */
export enum JobPriority {
  CRITICAL = 1, // Highest priority
  HIGH = 5,
  NORMAL = 10,
  LOW = 20,
}

/**
 * Helper to add job to queue
 */
export async function addJob<T = any>(
  queueName: keyof typeof queues,
  jobName: string,
  data: T,
  options?: {
    priority?: JobPriority;
    delay?: number;
    attempts?: number;
    timeout?: number;
  }
) {
  const queue = queues[queueName];

  return await queue.add(jobName, data, {
    priority: options?.priority || JobPriority.NORMAL,
    delay: options?.delay,
    attempts: options?.attempts,
    // timeout: options?.timeout,
  });
}

/**
 * Close all queues gracefully
 */
export async function closeAllQueues() {
  await Promise.all(
    Object.values(queues).map((queue) => queue.close())
  );
  console.log('✅ All queues closed');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: keyof typeof queues) {
  const queue = queues[queueName];
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats() {
  const stats = await Promise.all(
    Object.keys(queues).map((queueName) =>
      getQueueStats(queueName as keyof typeof queues)
    )
  );

  return stats;
}

export default queues;
