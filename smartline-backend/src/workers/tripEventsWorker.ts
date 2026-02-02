import { Worker } from 'bullmq';
import { config } from '../config/env';
import { QUEUE_NAMES } from '../config/queue';
import { SmartLineEvent, EVENT_TYPES } from '../events/types';
import { matchingService } from '../services/matchingService';
import { dispatchStrategy, DispatchStrategy } from '../services/dispatchStrategy';
import { eventPublisher } from '../events/publisher';

const connection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
};

/**
 * Trip Events Worker - Processes trip lifecycle events
 * Handles matching, notifications, and state transitions
 */
export const tripEventsWorker = new Worker(
  QUEUE_NAMES.TRIP_EVENTS,
  async (job) => {
    const event = job.data as SmartLineEvent;

    console.log(`[TripEvents] Processing: ${event.eventType}`);

    try {
      switch (event.eventType) {
        case EVENT_TYPES.TRIP_REQUESTED:
          await handleTripRequested(event as any);
          break;

        case EVENT_TYPES.TRIP_MATCHED:
          await handleTripMatched(event as any);
          break;

        case EVENT_TYPES.TRIP_DRIVER_ARRIVED:
          await handleDriverArrived(event as any);
          break;

        case EVENT_TYPES.TRIP_STARTED:
          await handleTripStarted(event as any);
          break;

        case EVENT_TYPES.TRIP_COMPLETED:
          await handleTripCompleted(event as any);
          break;

        case EVENT_TYPES.TRIP_CANCELLED:
          await handleTripCancelled(event as any);
          break;

        default:
          console.warn(`Unhandled trip event type: ${event.eventType}`);
      }

      return { success: true, event: event.eventType };
    } catch (error: any) {
      console.error(`[TripEvents] Error processing ${event.eventType}:`, error);
      throw error; // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs concurrently
  }
);

/**
 * Handle TRIP_REQUESTED event
 * Triggers driver matching and dispatch
 */
async function handleTripRequested(event: any) {
  const { tripId, customerId, pickupLat, pickupLng, destLat, destLng, vehicleType } =
    event.data;

  console.log(`[TripEvents] Trip requested: ${tripId}`);

  // Find optimal drivers
  const drivers = await matchingService.findOptimalDrivers(
    {
      customerId,
      pickupLat,
      pickupLng,
      destLat,
      destLng,
      vehicleType,
      pickupAddress: event.data.pickupAddress,
      destAddress: event.data.destAddress,
    },
    10
  );

  if (drivers.length === 0) {
    console.warn(`[TripEvents] No drivers found for trip ${tripId}`);
    // TODO: Notify customer
    // await eventPublisher.publish({
    //   eventType: EVENT_TYPES.NOTIFICATION,
    //   ...
    // });
    return;
  }

  // Dispatch to drivers using FIRST_ACCEPT strategy
  await dispatchStrategy.dispatchFirstAccept(
    {
      customerId,
      pickupLat,
      pickupLng,
      destLat,
      destLng,
      vehicleType,
      pickupAddress: event.data.pickupAddress,
      destAddress: event.data.destAddress,
    },
    tripId,
    { maxDrivers: 5, timeoutSeconds: 15 }
  );

  console.log(`[TripEvents] Dispatched trip ${tripId} to ${drivers.length} drivers`);

  // TODO: Send push notifications to drivers
  // This will be implemented with notification service
}

/**
 * Handle TRIP_MATCHED event
 * Notifies customer and driver
 */
async function handleTripMatched(event: any) {
  const { tripId, customerId, driverId, estimatedArrival } = event.data;

  console.log(`[TripEvents] Trip matched: ${tripId} -> Driver ${driverId}`);

  // Notify customer
  await eventPublisher.publish({
    eventType: EVENT_TYPES.NOTIFICATION,
    aggregateId: tripId,
    aggregateType: 'Trip',
    timestamp: new Date().toISOString(),
    data: {
      recipientId: customerId,
      type: 'push',
      title: 'Driver Found!',
      message: `Your driver will arrive in ${Math.round(estimatedArrival / 60)} minutes`,
      priority: 'high',
      data: {
        tripId,
        driverId,
        estimatedArrival,
      },
    },
  } as any);

  // Notify driver
  await eventPublisher.publish({
    eventType: EVENT_TYPES.NOTIFICATION,
    aggregateId: tripId,
    aggregateType: 'Trip',
    timestamp: new Date().toISOString(),
    data: {
      recipientId: driverId,
      type: 'push',
      title: 'New Trip Assigned',
      message: 'Navigate to pickup location',
      priority: 'high',
      data: {
        tripId,
        customerId,
      },
    },
  } as any);
}

/**
 * Handle TRIP_DRIVER_ARRIVED event
 */
async function handleDriverArrived(event: any) {
  const { tripId, driverId, customerId } = event.data;

  console.log(`[TripEvents] Driver arrived for trip: ${tripId}`);

  // Notify customer
  await eventPublisher.publish({
    eventType: EVENT_TYPES.NOTIFICATION,
    aggregateId: tripId,
    aggregateType: 'Trip',
    timestamp: new Date().toISOString(),
    data: {
      recipientId: event.data.customerId || customerId,
      type: 'push',
      title: 'Driver Arrived',
      message: 'Your driver has arrived at the pickup location',
      priority: 'high',
      data: { tripId, driverId },
    },
  } as any);
}

/**
 * Handle TRIP_STARTED event
 */
async function handleTripStarted(event: any) {
  const { tripId, customerId } = event.data;

  console.log(`[TripEvents] Trip started: ${tripId}`);

  // Start tracking route
  // (Already handled by tripTracker in location updates)

  // Analytics event
  // Track start time, location, etc.
}

/**
 * Handle TRIP_COMPLETED event
 * Triggers payment processing
 */
async function handleTripCompleted(event: any) {
  const { tripId, customerId, driverId, finalPrice, paymentMethod } = event.data;

  console.log(`[TripEvents] Trip completed: ${tripId}, Price: ${finalPrice}`);

  // Trigger payment processing
  if (paymentMethod !== 'cash') {
    await eventPublisher.publish({
      eventType: EVENT_TYPES.PAYMENT_INITIATED,
      aggregateId: tripId,
      aggregateType: 'Payment',
      timestamp: new Date().toISOString(),
      data: {
        paymentId: `pay_${tripId}`,
        userId: customerId,
        amount: finalPrice,
        method: paymentMethod,
        orderId: tripId,
      },
    } as any);
  }

  // Send receipt/summary to customer
  await eventPublisher.publish({
    eventType: EVENT_TYPES.NOTIFICATION,
    aggregateId: tripId,
    aggregateType: 'Trip',
    timestamp: new Date().toISOString(),
    data: {
      recipientId: customerId,
      type: 'push',
      title: 'Trip Completed',
      message: `Total: ${finalPrice} EGP. Thank you for riding with SmartLine!`,
      priority: 'normal',
      data: { tripId, finalPrice },
    },
  } as any);

  // Notify driver
  await eventPublisher.publish({
    eventType: EVENT_TYPES.NOTIFICATION,
    aggregateId: tripId,
    aggregateType: 'Trip',
    timestamp: new Date().toISOString(),
    data: {
      recipientId: driverId,
      type: 'push',
      title: 'Trip Completed',
      message: 'Earnings will be credited to your wallet',
      priority: 'normal',
      data: { tripId, finalPrice },
    },
  } as any);
}

/**
 * Handle TRIP_CANCELLED event
 */
async function handleTripCancelled(event: any) {
  const { tripId, cancelledBy, reason } = event.data;

  console.log(`[TripEvents] Trip cancelled: ${tripId} by ${cancelledBy}`);

  // Notify affected parties
  // Handle cancellation fees if applicable
  // Release driver from assignment
}

// Worker event handlers
tripEventsWorker.on('completed', (job, result) => {
  console.log(`[TripEvents] Job ${job.id} completed:`, result);
});

tripEventsWorker.on('failed', (job, error) => {
  console.error(`[TripEvents] Job ${job?.id} failed:`, error.message);
});

tripEventsWorker.on('error', (error) => {
  console.error('[TripEvents] Worker error:', error);
});

console.log('✅ Trip Events Worker initialized');

export default tripEventsWorker;
