import express from 'express';
import { getActivePopup, getPopups, createPopup, updatePopup, deletePopup } from '../controllers/popupController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = express.Router();

// Public app endpoint used by Customer/Driver apps
router.get('/active', getActivePopup);

// Protected Admin/Dashboard Endpoints
router.use(authenticate);

// List all for management
router.get('/', requireRole('super_admin', 'admin', 'manager'), getPopups);

// Create
router.post('/', requireRole('super_admin', 'admin'), createPopup);

// Update
router.put('/:id', requireRole('super_admin', 'admin'), updatePopup);

// Delete
router.delete('/:id', requireRole('super_admin', 'admin'), deletePopup);

export default router;
