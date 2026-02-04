import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireDriver } from '../middleware/rbac';
import {
  getDestinationPreferences,
  updateDestinationPreferences,
  addPreferredDestination,
  deletePreferredDestination
} from '../controllers/driverPreferenceController';

const router = Router();

// All routes require driver authentication
router.get('/destinations', authenticate, requireDriver, getDestinationPreferences);
router.put('/destinations', authenticate, requireDriver, updateDestinationPreferences);
router.post('/destinations/add', authenticate, requireDriver, addPreferredDestination);
router.delete('/destinations/:destinationId', authenticate, requireDriver, deletePreferredDestination);

export default router;
