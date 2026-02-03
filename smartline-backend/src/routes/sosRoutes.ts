import { Router } from 'express';
import {
    createSOSAlert,
    getMySOSAlerts,
    getAllSOSAlerts,
    resolveSOSAlert,
    cancelSOSAlert
} from '../controllers/sosController';
import { authenticate } from '../middleware/auth';
import { requireDriver, requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas - Dashboard Compatible
const createSOSSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    trip_id: z.string().uuid().optional(),
    notes: z.string().max(500).optional()
});

const resolveSOSSchema = z.object({
    notes: z.string().max(500).optional()
});

// Driver endpoints
router.post(
    '/create',
    authenticate,
    requireDriver,
    validateBody(createSOSSchema),
    createSOSAlert
);

router.get(
    '/my-alerts',
    authenticate,
    requireDriver,
    getMySOSAlerts
);

router.post(
    '/cancel/:id',
    authenticate,
    requireDriver,
    cancelSOSAlert
);

// Admin endpoints
router.get(
    '/all',
    authenticate,
    requireAdmin,
    getAllSOSAlerts
);

router.post(
    '/resolve/:id',
    authenticate,
    requireAdmin,
    validateBody(resolveSOSSchema),
    resolveSOSAlert
);

export default router;
