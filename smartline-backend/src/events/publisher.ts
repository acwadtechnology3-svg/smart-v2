import { SmartLineEvent, EVENT_TYPES } from './types';
import { addJob, JobPriority } from '../config/queue';
import { query } from '../config/database';

/**
 * Event Publisher - Publishes domain events to queues and event store
 * Implements outbox pattern for reliability
 */
export class EventPublisher {
  /**
   * Publish a single event
   */
  async publish(event: SmartLineEvent): Promise<void> {
    try {
      // 1. Store in event store (for event sourcing)
      await this.storeEvent(event);

      // 2. Dispatch to appropriate queue
      await this.dispatchEvent(event);

      console.log(`Published event: ${event.eventType} for ${event.aggregateId}`);
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(events: SmartLineEvent[]): Promise<void> {
    try {
      // Process events in parallel
      await Promise.all(events.map((event) => this.publish(event)));
    } catch (error) {
      console.error('Error publishing batch events:', error);
      throw error;
    }
  }

  /**
   * Store event in event store
   */
  private async storeEvent(event: SmartLineEvent): Promise<void> {
    try {
      // Get next sequence number for this aggregate
      const sequence = await this.getNextSequence(
        event.aggregateType,
        event.aggregateId
      );

      // Insert into event store
      await query(
        `INSERT INTO event_store
         (event_type, aggregate_type, aggregate_id, payload, metadata, sequence_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.eventType,
          event.aggregateType,
          event.aggregateId,
          JSON.stringify((event as any).data),
          JSON.stringify(event.metadata || {}),
          sequence,
        ]
      );
    } catch (error) {
      console.error('Error storing event:', error);
      // Don't throw - event store failure shouldn't break the flow
    }
  }

  /**
   * Get next sequence number for aggregate
   */
  private async getNextSequence(
    aggregateType: string,
    aggregateId: string
  ): Promise<number> {
    const result = await query(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
       FROM event_store
       WHERE aggregate_type = $1 AND aggregate_id = $2`,
      [aggregateType, aggregateId]
    );

    return result.rows[0].next_seq;
  }

  /**
   * Dispatch event to appropriate queue
   */
  private async dispatchEvent(event: SmartLineEvent): Promise<void> {
    const priority = this.getEventPriority(event.eventType);

    switch (event.eventType) {
      // Trip events -> trip-events queue
      case EVENT_TYPES.TRIP_REQUESTED:
      case EVENT_TYPES.TRIP_MATCHED:
      case EVENT_TYPES.TRIP_DRIVER_ARRIVED:
      case EVENT_TYPES.TRIP_STARTED:
      case EVENT_TYPES.TRIP_COMPLETED:
      case EVENT_TYPES.TRIP_CANCELLED:
        await addJob('tripEvents', event.eventType, event, { priority });
        break;

      // Payment events -> payment-processing queue
      case EVENT_TYPES.PAYMENT_INITIATED:
      case EVENT_TYPES.PAYMENT_COMPLETED:
      case EVENT_TYPES.PAYMENT_FAILED:
      case EVENT_TYPES.WALLET_CREDITED:
      case EVENT_TYPES.WALLET_DEBITED:
        await addJob('paymentProcessing', event.eventType, event, {
          priority: JobPriority.CRITICAL, // Always critical
        });
        break;

      // Driver location events -> analytics queue (not critical)
      case EVENT_TYPES.DRIVER_LOCATION_UPDATED:
        await addJob('analytics', event.eventType, event, {
          priority: JobPriority.LOW,
        });
        break;

      // Driver online/offline -> notifications queue
      case EVENT_TYPES.DRIVER_ONLINE:
      case EVENT_TYPES.DRIVER_OFFLINE:
        await addJob('analytics', event.eventType, event, {
          priority: JobPriority.NORMAL,
        });
        break;

      // Notification events -> notifications queue
      case EVENT_TYPES.NOTIFICATION:
        await addJob('notifications', event.eventType, event, {
          priority,
        });
        break;

      default:
        console.warn(`No queue mapping for event type: ${(event as any).eventType}`);
    }
  }

  /**
   * Determine priority based on event type
   */
  private getEventPriority(eventType: string): JobPriority {
    const criticalEvents = [
      EVENT_TYPES.TRIP_MATCHED,
      EVENT_TYPES.PAYMENT_COMPLETED,
      EVENT_TYPES.PAYMENT_FAILED,
    ];

    const highPriorityEvents = [
      EVENT_TYPES.TRIP_REQUESTED,
      EVENT_TYPES.TRIP_STARTED,
      EVENT_TYPES.TRIP_COMPLETED,
    ];

    if (criticalEvents.includes(eventType as any)) {
      return JobPriority.CRITICAL;
    }

    if (highPriorityEvents.includes(eventType as any)) {
      return JobPriority.HIGH;
    }

    return JobPriority.NORMAL;
  }

  /**
   * Publish event using outbox pattern (for transactional guarantee)
   */
  async publishWithOutbox(
    event: SmartLineEvent,
    dbClient: any
  ): Promise<void> {
    try {
      // Insert into outbox table within same transaction
      await dbClient.query(
        `INSERT INTO outbox (event_type, payload, status)
         VALUES ($1, $2, 'pending')`,
        [event.eventType, JSON.stringify(event)]
      );

      // Outbox processor will pick this up and publish
    } catch (error) {
      console.error('Error adding to outbox:', error);
      throw error;
    }
  }

  /**
   * Get event stream for an aggregate (for event sourcing replay)
   */
  async getEventStream(
    aggregateType: string,
    aggregateId: string
  ): Promise<SmartLineEvent[]> {
    const result = await query(
      `SELECT event_type, payload, metadata, created_at
       FROM event_store
       WHERE aggregate_type = $1 AND aggregate_id = $2
       ORDER BY sequence_number ASC`,
      [aggregateType, aggregateId]
    );

    return result.rows.map((row) => ({
      eventType: row.event_type,
      aggregateType,
      aggregateId,
      timestamp: row.created_at,
      data: row.payload,
      metadata: row.metadata,
    })) as SmartLineEvent[];
  }
}

// Export singleton instance
export const eventPublisher = new EventPublisher();
