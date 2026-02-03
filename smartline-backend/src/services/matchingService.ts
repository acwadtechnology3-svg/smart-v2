import { locationCache, NearbyDriver } from './locationCache';
import { driverPresence } from './driverPresence';
import { DriverRepository } from '../repositories/DriverRepository';

const driverRepo = new DriverRepository();

export interface TripRequest {
  customerId: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  vehicleType: string;
  pickupAddress: string;
  destAddress: string;
}

export interface ScoredDriver {
  driverId: string;
  score: number;
  distance: number; // meters
  lat: number;
  lng: number;
  rating: number;
  acceptanceRate: number;
  completionRate: number;
  vehicleType: string;
  vehicleModel: string;
  breakdown: {
    distanceScore: number;
    ratingScore: number;
    acceptanceScore: number;
    completionScore: number;
    vehicleMatchScore: number;
    repeatCustomerScore: number;
  };
}

/**
 * Matching Service - Intelligent driver matching and ranking
 * Uses multi-factor scoring to find optimal drivers for trips
 */
export class MatchingService {
  // Scoring weights (must sum to 1.0)
  private readonly WEIGHTS = {
    DISTANCE: 0.40, // 40% - Proximity is most important
    RATING: 0.20, // 20% - Driver quality
    ACCEPTANCE_RATE: 0.15, // 15% - Reliability
    COMPLETION_RATE: 0.10, // 10% - Trip completion success
    VEHICLE_MATCH: 0.10, // 10% - Exact vehicle type match
    REPEAT_CUSTOMER: 0.05, // 5% - Previous positive interaction
  };

  private readonly MAX_SEARCH_RADIUS_KM = 10; // Maximum search radius
  private readonly MIN_RATING = 3.0; // Minimum acceptable rating

  /**
   * Find and rank optimal drivers for a trip request
   */
  async findOptimalDrivers(
    tripRequest: TripRequest,
    limit: number = 10
  ): Promise<ScoredDriver[]> {
    try {
      // Step 1: Try to get nearby drivers from Redis (fast geospatial query)
      let nearbyDrivers = await locationCache.getNearbyDrivers(
        tripRequest.pickupLat,
        tripRequest.pickupLng,
        this.MAX_SEARCH_RADIUS_KM,
        50
      );

      // Step 1b: If Redis fails (empty result), fallback to database PostGIS query
      if (nearbyDrivers.length === 0) {
        console.log('[MatchingService] Redis cache empty, using database fallback');
        const dbDrivers = await driverRepo.findNearbyOnlineDrivers(
          tripRequest.pickupLat,
          tripRequest.pickupLng,
          this.MAX_SEARCH_RADIUS_KM,
          tripRequest.vehicleType,
          50
        );
        
        // Convert to NearbyDriver format
        nearbyDrivers = dbDrivers.map(d => ({
          driverId: d.driver_id,
          lat: d.current_lat,
          lng: d.current_lng,
          distance: d.distance_meters,
        }));
      }

      if (nearbyDrivers.length === 0) {
        return [];
      }

      // Step 2: Enrich with database data and calculate scores
      const scoredDrivers: ScoredDriver[] = [];

      for (const nearbyDriver of nearbyDrivers) {
        // Get full driver data from database
        const driverData = await driverRepo.findById(nearbyDriver.driverId);

        if (!driverData) continue;

        // Apply filters
        if (!this.isEligible(driverData, tripRequest)) {
          continue;
        }

        // Calculate score
        const scored = await this.calculateDriverScore(
          nearbyDriver,
          driverData,
          tripRequest
        );

        scoredDrivers.push(scored);
      }

      // Step 3: Sort by score (highest first) and limit
      scoredDrivers.sort((a, b) => b.score - a.score);

      return scoredDrivers.slice(0, limit);
    } catch (error) {
      console.error('Error finding optimal drivers:', error);
      return [];
    }
  }

  /**
   * Calculate comprehensive score for a driver
   */
  private async calculateDriverScore(
    nearbyDriver: NearbyDriver,
    driverData: any,
    tripRequest: TripRequest
  ): Promise<ScoredDriver> {
    // 1. Distance Score (0-1, closer = higher)
    const maxDistance = this.MAX_SEARCH_RADIUS_KM * 1000; // meters
    const distanceScore = Math.max(
      0,
      1 - (nearbyDriver.distance || 0) / maxDistance
    );

    // 2. Rating Score (0-1, normalized from 1-5)
    const ratingScore = (driverData.rating - 1) / 4; // Convert 1-5 to 0-1

    // 3. Acceptance Rate Score (0-1)
    // TODO: Get from driver stats table
    const acceptanceRate = 0.85; // Placeholder - implement stats tracking
    const acceptanceScore = acceptanceRate;

    // 4. Completion Rate Score (0-1)
    // TODO: Get from driver stats table
    const completionRate = 0.92; // Placeholder - implement stats tracking
    const completionScore = completionRate;

    // 5. Vehicle Match Score (0 or 1)
    const vehicleMatchScore =
      driverData.vehicle_type === tripRequest.vehicleType ? 1.0 : 0.5;

    // 6. Repeat Customer Score (0 or 1)
    // TODO: Check if driver has completed trips for this customer before
    const repeatCustomerScore = 0; // Placeholder

    // Calculate weighted total score
    const totalScore =
      distanceScore * this.WEIGHTS.DISTANCE +
      ratingScore * this.WEIGHTS.RATING +
      acceptanceScore * this.WEIGHTS.ACCEPTANCE_RATE +
      completionScore * this.WEIGHTS.COMPLETION_RATE +
      vehicleMatchScore * this.WEIGHTS.VEHICLE_MATCH +
      repeatCustomerScore * this.WEIGHTS.REPEAT_CUSTOMER;

    return {
      driverId: nearbyDriver.driverId,
      score: totalScore,
      distance: nearbyDriver.distance || 0,
      lat: nearbyDriver.lat,
      lng: nearbyDriver.lng,
      rating: driverData.rating,
      acceptanceRate,
      completionRate,
      vehicleType: driverData.vehicle_type,
      vehicleModel: driverData.vehicle_model,
      breakdown: {
        distanceScore: distanceScore * this.WEIGHTS.DISTANCE,
        ratingScore: ratingScore * this.WEIGHTS.RATING,
        acceptanceScore: acceptanceScore * this.WEIGHTS.ACCEPTANCE_RATE,
        completionScore: completionScore * this.WEIGHTS.COMPLETION_RATE,
        vehicleMatchScore: vehicleMatchScore * this.WEIGHTS.VEHICLE_MATCH,
        repeatCustomerScore: repeatCustomerScore * this.WEIGHTS.REPEAT_CUSTOMER,
      },
    };
  }

  /**
   * Check if driver is eligible for the trip
   */
  private isEligible(driverData: any, tripRequest: TripRequest): boolean {
    // Must be approved
    if (driverData.status !== 'approved') {
      return false;
    }

    // Must be online (checked by location cache, but double-check)
    if (!driverData.is_online) {
      return false;
    }

    // Must have minimum rating
    if (driverData.rating < this.MIN_RATING) {
      return false;
    }

    // Vehicle type must match or be higher tier
    // TODO: Implement vehicle tier hierarchy (economy < comfort < premium)

    return true;
  }

  /**
   * Get single best driver for trip
   */
  async findBestDriver(tripRequest: TripRequest): Promise<ScoredDriver | null> {
    const drivers = await this.findOptimalDrivers(tripRequest, 1);
    return drivers.length > 0 ? drivers[0] : null;
  }

  /**
   * Re-rank drivers after one declines
   */
  async reRankDrivers(
    tripRequest: TripRequest,
    excludeDriverIds: string[]
  ): Promise<ScoredDriver[]> {
    const allDrivers = await this.findOptimalDrivers(tripRequest, 20);

    // Filter out excluded drivers
    return allDrivers.filter((d) => !excludeDriverIds.includes(d.driverId));
  }
}

// Export singleton instance
export const matchingService = new MatchingService();
