import { Router } from 'express';
import {
  updateLocation,
  batchUpdateLocation,
  getNearbyDrivers,
  getCurrentLocation,
  setOnlineStatus,
  getLocationStats,
} from '../controllers/locationController';
import { authenticate } from '../middleware/auth';
import { requireDriver } from '../middleware/rbac';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  locationUpdateSchema,
  nearbyDriversSchema,
  updateDriverStatusSchema,
} from '../validators/schemas';
import { z } from 'zod';

const router = Router();

// ===== Driver Location Updates =====

// Update current location (called every 3-5 seconds by driver app)
router.post(
  '/update',
  authenticate,
  requireDriver,
  validateBody(locationUpdateSchema),
  updateLocation
);

// Batch update locations (for offline sync)
router.post(
  '/batch-update',
  authenticate,
  requireDriver,
  validateBody(
    z.object({
      locations: z.array(locationUpdateSchema).min(1).max(100),
    })
  ),
  batchUpdateLocation
);

// Get driver's own current location
router.get(
  '/current',
  authenticate,
  requireDriver,
  getCurrentLocation
);

// Set online/offline status
router.post(
  '/status',
  authenticate,
  requireDriver,
  validateBody(updateDriverStatusSchema),
  setOnlineStatus
);

// ===== Query Nearby Drivers =====

// Get nearby drivers (public or authenticated - for customers)
router.get(
  '/nearby',
  authenticate,
  validateQuery(nearbyDriversSchema),
  getNearbyDrivers
);

// ===== Statistics & Monitoring =====

// Get location system statistics (admin/monitoring)
router.get(
  '/stats',
  authenticate,
  // TODO: Add requireAdmin middleware
  getLocationStats
);

export default router;
