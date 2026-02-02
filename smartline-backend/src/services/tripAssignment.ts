import { transaction } from '../config/database';
import { tripLock } from './tripLock';
import { driverFilter } from './driverFilter';
import { dispatchStrategy } from './dispatchStrategy';
import { supabase } from '../config/supabase';

export interface AssignmentResult {
  success: boolean;
  tripId: string;
  driverId?: string;
  message: string;
}

/**
 * Trip Assignment Service - Atomically assigns trips to drivers
 * Handles all database updates and state changes in a single transaction
 */
export class TripAssignmentService {
  /**
   * Assign trip to driver atomically
   * Uses distributed locks and database transaction
   */
  async assignTripToDriver(
    tripId: string,
    driverId: string,
    offerId?: string
  ): Promise<AssignmentResult> {
    try {
      // Step 1: Acquire distributed locks
      const locks = await tripLock.lockTripAndDriver(tripId, driverId);

      try {
        // Step 2: Verify driver is still eligible
        const isEligible = await driverFilter.isDriverEligible(driverId);
        if (!isEligible) {
          return {
            success: false,
            tripId,
            message: 'Driver is no longer eligible',
          };
        }

        // Step 3: Execute atomic assignment in database transaction
        const result = await this.executeAssignment(tripId, driverId, offerId);

        if (result.success) {
          // Step 4: Update Redis state
          await driverFilter.setActiveTrip(driverId, tripId);
          await dispatchStrategy.clearPendingOffers(tripId);
        }

        return result;
      } finally {
        // Step 5: Always release locks
        await tripLock.releaseLocks([locks.tripLock, locks.driverLock]);
      }
    } catch (error: any) {
      console.error('Trip assignment error:', error);
      return {
        success: false,
        tripId,
        message: error.message || 'Failed to assign trip',
      };
    }
  }

  /**
   * Execute assignment in database transaction
   */
  private async executeAssignment(
    tripId: string,
    driverId: string,
    offerId?: string
  ): Promise<AssignmentResult> {
    try {
      // Use database transaction for atomicity
      const client = await transaction(async (txClient) => {
        // 1. Check trip is still available
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripError || !trip) {
          throw new Error('Trip not found');
        }

        if (trip.status !== 'requested') {
          throw new Error('Trip is no longer available');
        }

        if (trip.driver_id) {
          throw new Error('Trip already has a driver');
        }

        // 2. Update trip with driver and change status
        const { error: updateError } = await supabase
          .from('trips')
          .update({
            driver_id: driverId,
            status: 'accepted',
          })
          .eq('id', tripId)
          .eq('status', 'requested'); // Optimistic locking

        if (updateError) {
          throw new Error('Failed to update trip');
        }

        // 3. Update offer status if offer was involved
        if (offerId) {
          // Accept winning offer
          await supabase
            .from('trip_offers')
            .update({ status: 'accepted' })
            .eq('id', offerId);

          // Reject other offers for this trip
          await supabase
            .from('trip_offers')
            .update({ status: 'rejected' })
            .eq('trip_id', tripId)
            .neq('id', offerId)
            .eq('status', 'pending');
        }

        // 4. Insert trip assignment event (for audit trail)
        // TODO: Implement event store in Phase 5

        return { tripId, driverId };
      });

      return {
        success: true,
        tripId,
        driverId,
        message: 'Trip assigned successfully',
      };
    } catch (error: any) {
      console.error('Assignment transaction error:', error);
      return {
        success: false,
        tripId,
        message: error.message || 'Transaction failed',
      };
    }
  }

  /**
   * Handle driver declining a trip offer
   */
  async declineTripOffer(
    tripId: string,
    driverId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Remove from pending offers
      await dispatchStrategy.removePendingDriver(tripId, driverId);

      // Update offer status if exists
      const { data: offer } = await supabase
        .from('trip_offers')
        .select('id')
        .eq('trip_id', tripId)
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .single();

      if (offer) {
        await supabase
          .from('trip_offers')
          .update({
            status: 'rejected',
            // Store decline reason if needed
          })
          .eq('id', offer.id);
      }

      // TODO: Track decline statistics for driver
      // TODO: Emit event for analytics

      console.log(`Driver ${driverId} declined trip ${tripId}. Reason: ${reason || 'N/A'}`);
    } catch (error) {
      console.error('Error handling trip decline:', error);
    }
  }

  /**
   * Handle trip timeout (no driver accepted)
   */
  async handleTripTimeout(tripId: string): Promise<void> {
    try {
      // Clear pending offers
      await dispatchStrategy.clearPendingOffers(tripId);

      // Update trip status
      await supabase
        .from('trips')
        .update({
          status: 'timeout', // Or keep as 'requested' for retry
        })
        .eq('id', tripId)
        .eq('status', 'requested');

      // TODO: Notify customer
      // TODO: Attempt retry with expanded radius

      console.log(`Trip ${tripId} timed out - no drivers accepted`);
    } catch (error) {
      console.error('Error handling trip timeout:', error);
    }
  }

  /**
   * Release driver from trip (on trip completion or cancellation)
   */
  async releaseDriver(driverId: string, cooldownSeconds?: number): Promise<void> {
    try {
      // Clear active trip marker
      await driverFilter.clearActiveTrip(driverId);

      // Set cooldown period
      await driverFilter.setCooldown(driverId, cooldownSeconds);

      console.log(`Driver ${driverId} released with ${cooldownSeconds || 60}s cooldown`);
    } catch (error) {
      console.error('Error releasing driver:', error);
    }
  }

  /**
   * Cancel trip assignment (before driver arrival)
   */
  async cancelTripAssignment(
    tripId: string,
    cancelledBy: 'customer' | 'driver',
    reason?: string
  ): Promise<AssignmentResult> {
    try {
      // Get trip details
      const { data: trip } = await supabase
        .from('trips')
        .select('*, driver_id')
        .eq('id', tripId)
        .single();

      if (!trip) {
        return {
          success: false,
          tripId,
          message: 'Trip not found',
        };
      }

      // Update trip status
      await supabase
        .from('trips')
        .update({
          status: 'cancelled',
          // Store cancellation details
        })
        .eq('id', tripId);

      // Release driver if assigned
      if (trip.driver_id) {
        await this.releaseDriver(trip.driver_id, 0); // No cooldown for cancelled trips
      }

      // TODO: Handle cancellation fees if applicable
      // TODO: Track cancellation statistics

      return {
        success: true,
        tripId,
        message: 'Trip cancelled successfully',
      };
    } catch (error: any) {
      console.error('Error cancelling trip:', error);
      return {
        success: false,
        tripId,
        message: error.message || 'Failed to cancel trip',
      };
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(): Promise<any> {
    // TODO: Implement assignment statistics
    // - Average time to assignment
    // - Assignment success rate
    // - Driver acceptance rate
    // - Timeout rate
    return {
      totalAssignments: 0,
      averageTimeSeconds: 0,
      successRate: 0,
    };
  }
}

// Export singleton instance
export const tripAssignment = new TripAssignmentService();
