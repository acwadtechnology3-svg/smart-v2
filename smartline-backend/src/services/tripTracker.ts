import redis from '../config/redis';
import { query } from '../config/database';

const TRIP_ROUTE_PREFIX = 'trip:';
const TRIP_ROUTE_SUFFIX = ':route';
const MAX_ROUTE_POINTS = 1000; // Limit points per trip

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

/**
 * Trip Tracker Service - Records driver routes during active trips
 * Stores route in Redis during trip, persists to database on completion
 */
export class TripTrackerService {
  /**
   * Start tracking a trip
   */
  async startTracking(tripId: string, driverId: string): Promise<boolean> {
    try {
      const key = `${TRIP_ROUTE_PREFIX}${tripId}${TRIP_ROUTE_SUFFIX}`;

      // Initialize route with metadata
      await redis.hset(`${TRIP_ROUTE_PREFIX}${tripId}:meta`, {
        driverId,
        startTime: new Date().toISOString(),
        status: 'active',
      });

      // Set TTL (24 hours for safety)
      await redis.expire(`${TRIP_ROUTE_PREFIX}${tripId}:meta`, 86400);

      console.log(`Started tracking trip ${tripId} for driver ${driverId}`);
      return true;
    } catch (error) {
      console.error('Failed to start trip tracking:', error);
      return false;
    }
  }

  /**
   * Add a route point to the trip
   */
  async addRoutePoint(
    tripId: string,
    lat: number,
    lng: number,
    timestamp?: string,
    speed?: number,
    heading?: number
  ): Promise<boolean> {
    try {
      const key = `${TRIP_ROUTE_PREFIX}${tripId}${TRIP_ROUTE_SUFFIX}`;

      // Create route point
      const point: RoutePoint = {
        lat,
        lng,
        timestamp: timestamp || new Date().toISOString(),
        ...(speed !== undefined && { speed }),
        ...(heading !== undefined && { heading }),
      };

      // Add to list (right push)
      await redis.rpush(key, JSON.stringify(point));

      // Check list length and trim if needed
      const length = await redis.llen(key);
      if (length > MAX_ROUTE_POINTS) {
        // Keep only the last MAX_ROUTE_POINTS
        await redis.ltrim(key, -MAX_ROUTE_POINTS, -1);
      }

      // Refresh TTL
      await redis.expire(key, 86400); // 24 hours

      return true;
    } catch (error) {
      console.error('Failed to add route point:', error);
      return false;
    }
  }

  /**
   * Get all route points for a trip
   */
  async getRoutePoints(tripId: string): Promise<RoutePoint[]> {
    try {
      const key = `${TRIP_ROUTE_PREFIX}${tripId}${TRIP_ROUTE_SUFFIX}`;
      const points = await redis.lrange(key, 0, -1);

      return points.map(point => JSON.parse(point));
    } catch (error) {
      console.error('Failed to get route points:', error);
      return [];
    }
  }

  /**
   * Get trip metadata
   */
  async getTripMetadata(tripId: string): Promise<any> {
    try {
      const metadata = await redis.hgetall(`${TRIP_ROUTE_PREFIX}${tripId}:meta`);
      return Object.keys(metadata).length > 0 ? metadata : null;
    } catch (error) {
      console.error('Failed to get trip metadata:', error);
      return null;
    }
  }

  /**
   * Calculate trip distance from route points using Haversine formula
   */
  async calculateTripDistance(tripId: string): Promise<number> {
    try {
      const points = await this.getRoutePoints(tripId);

      if (points.length < 2) {
        return 0;
      }

      let totalDistance = 0;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        totalDistance += this.haversineDistance(
          prev.lat,
          prev.lng,
          curr.lat,
          curr.lng
        );
      }

      return totalDistance; // in meters
    } catch (error) {
      console.error('Failed to calculate trip distance:', error);
      return 0;
    }
  }

  /**
   * Stop tracking and persist route to database
   */
  async stopTracking(tripId: string): Promise<boolean> {
    try {
      const points = await this.getRoutePoints(tripId);
      const metadata = await this.getTripMetadata(tripId);

      if (points.length === 0) {
        console.warn(`No route points found for trip ${tripId}`);
        return false;
      }

      // Persist to database (driver_location_history table)
      // Batch insert for performance
      const values: any[] = [];
      for (const point of points) {
        values.push({
          driver_id: metadata?.driverId,
          trip_id: tripId,
          lat: point.lat,
          lng: point.lng,
          heading: point.heading || null,
          speed: point.speed || null,
          recorded_at: point.timestamp,
        });
      }

      // Batch insert (will be implemented when location_history table exists)
      // For now, just log
      console.log(`Would persist ${points.length} route points for trip ${tripId}`);

      // TODO: Implement batch insert when migration 004 is applied
      // await this.batchInsertRoutePoints(values);

      // Cleanup Redis data
      await this.cleanupTrip(tripId);

      return true;
    } catch (error) {
      console.error('Failed to stop trip tracking:', error);
      return false;
    }
  }

  /**
   * Cleanup trip data from Redis
   */
  async cleanupTrip(tripId: string): Promise<boolean> {
    try {
      const pipeline = redis.pipeline();
      pipeline.del(`${TRIP_ROUTE_PREFIX}${tripId}${TRIP_ROUTE_SUFFIX}`);
      pipeline.del(`${TRIP_ROUTE_PREFIX}${tripId}:meta`);
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Failed to cleanup trip:', error);
      return false;
    }
  }

  /**
   * Get active tracking sessions count
   */
  async getActiveTrackingCount(): Promise<number> {
    try {
      const keys = await redis.keys(`${TRIP_ROUTE_PREFIX}*:meta`);
      return keys.length;
    } catch (error) {
      console.error('Failed to get active tracking count:', error);
      return 0;
    }
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   * Returns distance in meters
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Batch insert route points to database (for future use)
   */
  private async batchInsertRoutePoints(points: any[]): Promise<void> {
    // TODO: Implement when migration 004 is applied
    // const values = points.map(p => `('${p.driver_id}', '${p.trip_id}', ${p.lat}, ${p.lng}, ...)`).join(',');
    // await query(`INSERT INTO driver_location_history (...) VALUES ${values}`);
  }
}

// Export singleton instance
export const tripTracker = new TripTrackerService();
