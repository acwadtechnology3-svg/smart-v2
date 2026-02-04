import express from 'express';
import { getActiveSurgeZones, getSurgeZones, createSurgeZone, updateSurgeZone, deleteSurgeZone } from '../controllers/surgeController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = express.Router();

// Public app endpoint (Driver Map)
router.get('/active', getActiveSurgeZones);

// Protected Admin Endpoints
router.use(authenticate);

// List all for management
router.get('/', requireRole('super_admin', 'admin', 'manager'), getSurgeZones);

// Create
router.post('/', requireRole('super_admin', 'admin'), createSurgeZone);

// Update
router.put('/:id', requireRole('super_admin', 'admin'), updateSurgeZone);

// Delete
router.delete('/:id', requireRole('super_admin', 'admin'), deleteSurgeZone);

export default router;
