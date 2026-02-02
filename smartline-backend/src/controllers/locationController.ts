import { Request, Response } from 'express';
import { locationCache } from '../services/locationCache';
import { driverPresence } from '../services/driverPresence';
import { tripTracker } from '../services/tripTracker';
import { DriverRepository } from '../repositories/DriverRepository';

const driverRepo = new DriverRepository();

/**
 * Update driver location (called frequently by driver app)
 * POST /api/location/update
 */
export const updateLocation = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id; // From auth middleware
    const { lat, lng, heading, speed, accuracy, timestamp } = req.body;

    // Update in Redis cache (instant)
    const updated = await locationCache.updateDriverLocation(
      driverId,
      lat,
      lng,
      {
        heading,
        speed,
        accuracy,
        timestamp: timestamp || new Date().toISOString(),
      }
    );

    if (!updated) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'LOCATION_UPDATE_FAILED',
          message: 'Failed to update location',
        },
      });
    }

    // Refresh driver's online presence
    await driverPresence.refreshPresence(driverId);

    // If driver is on active trip, track the route
    // TODO: Check if driver has active trip and call tripTracker.addRoutePoint()

    res.json({
      success: true,
      data: {
        updated: true,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update location',
      },
    });
  }
};

/**
 * Batch update locations (for offline sync)
 * POST /api/location/batch-update
 */
export const batchUpdateLocation = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Locations array is required',
        },
      });
    }

    // Process in batch (take only the most recent one for cache)
    const mostRecent = locations.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    // Update cache with most recent location
    await locationCache.updateDriverLocation(
      driverId,
      mostRecent.lat,
      mostRecent.lng,
      {
        heading: mostRecent.heading,
        speed: mostRecent.speed,
        accuracy: mostRecent.accuracy,
        timestamp: mostRecent.timestamp,
      }
    );

    // Refresh presence
    await driverPresence.refreshPresence(driverId);

    res.json({
      success: true,
      data: {
        processed: locations.length,
        latestTimestamp: mostRecent.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Batch location update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process batch update',
      },
    });
  }
};

/**
 * Get nearby drivers
 * GET /api/location/nearby?lat=30.0444&lng=31.2357&radius=5&vehicleType=economy
 */
export const getNearbyDrivers = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, vehicleType } = req.query;

    // Validate query params (should be validated by middleware)
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusKm = radius ? parseFloat(radius as string) : 5;

    // Get from Redis cache (fast)
    let nearbyDrivers = await locationCache.getNearbyDrivers(
      latitude,
      longitude,
      radiusKm,
      50 // limit
    );

    // Filter by vehicle type if specified
    if (vehicleType) {
      nearbyDrivers = nearbyDrivers.filter(
        d => d.metadata?.vehicleType === vehicleType
      );
    }

    // Format response (hide sensitive data)
    const drivers = nearbyDrivers.map(driver => ({
      driverId: driver.driverId,
      location: {
        lat: driver.lat,
        lng: driver.lng,
      },
      distance: Math.round(driver.distance), // meters
      vehicleType: driver.metadata?.vehicleType,
      rating: driver.metadata?.rating,
      heading: driver.metadata?.heading,
      lastUpdate: driver.metadata?.timestamp,
    }));

    res.json({
      success: true,
      data: {
        drivers,
        count: drivers.length,
        searchRadius: radiusKm,
        center: { lat: latitude, lng: longitude },
      },
    });
  } catch (error: any) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get nearby drivers',
      },
    });
  }
};

/**
 * Get driver's own current location
 * GET /api/location/current
 */
export const getCurrentLocation = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;

    const location = await locationCache.getDriverLocation(driverId);
    const metadata = await locationCache.getDriverMetadata(driverId);
    const isOnline = await driverPresence.isOnline(driverId);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'No location data available',
        },
      });
    }

    res.json({
      success: true,
      data: {
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        metadata,
        isOnline,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get current location error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get current location',
      },
    });
  }
};

/**
 * Set driver online/offline status
 * POST /api/location/status
 */
export const setOnlineStatus = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { isOnline, lat, lng } = req.body;

    if (isOnline) {
      // Going online - update location and presence
      if (lat && lng) {
        await locationCache.updateDriverLocation(driverId, lat, lng);
      }
      await driverPresence.setOnline(driverId);

      // Also update database
      await driverRepo.setOnlineStatus(driverId, true);
      if (lat && lng) {
        await driverRepo.updateLocation(driverId, lat, lng);
      }
    } else {
      // Going offline - remove from cache
      await driverPresence.setOffline(driverId);
      await driverRepo.setOnlineStatus(driverId, false);
    }

    res.json({
      success: true,
      data: {
        isOnline,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Set online status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update status',
      },
    });
  }
};

/**
 * Get location statistics (admin/monitoring)
 * GET /api/location/stats
 */
export const getLocationStats = async (req: Request, res: Response) => {
  try {
    const stats = await driverPresence.getStats();
    const activeTracking = await tripTracker.getActiveTrackingCount();

    res.json({
      success: true,
      data: {
        ...stats,
        activeTripsTracking: activeTracking,
      },
    });
  } catch (error: any) {
    console.error('Get location stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get statistics',
      },
    });
  }
};
