import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  loginDashboard,
  registerDashboardUser,
  getDashboardUsers,
  getCurrentUser,
  updateDashboardUser,
  deleteDashboardUser,
  changePassword,
  resetPassword,
  getRolePermissions,
  updateRolePermissions,
  initializeSuperAdmin,
} from '../controllers/dashboardAuthController';
import {
  dashboardLoginSchema,
  dashboardRegisterSchema,
  dashboardUpdateSchema,
  passwordChangeSchema,
  passwordResetSchema,
  initSuperAdminSchema,
} from '../validators/schemas';

const router = Router();

// Public routes
// Initialize first super admin (only works if no users exist)
router.post('/init', validateBody(initSuperAdminSchema), initializeSuperAdmin);

// Login for dashboard users
router.post('/login', validateBody(dashboardLoginSchema), loginDashboard);

// Protected routes - require authentication
router.use(authenticate);

// Get current user profile
router.get('/me', getCurrentUser);

// Change own password
router.post('/change-password', validateBody(passwordChangeSchema), changePassword);

// Super Admin only routes
router.post(
  '/register',
  requireRole('super_admin'),
  validateBody(dashboardRegisterSchema),
  registerDashboardUser
);

router.get(
  '/users',
  requireRole('super_admin', 'admin'),
  getDashboardUsers
);

router.patch(
  '/users/:id',
  requireRole('super_admin'),
  validateBody(dashboardUpdateSchema),
  updateDashboardUser
);

router.delete(
  '/users/:id',
  requireRole('super_admin'),
  deleteDashboardUser
);

router.post(
  '/users/:id/reset-password',
  requireRole('super_admin'),
  validateBody(passwordResetSchema),
  resetPassword
);

// Role permissions management (Super Admin only)
router.get(
  '/permissions/:role',
  requireRole('super_admin'),
  getRolePermissions
);

router.put(
  '/permissions/:role',
  requireRole('super_admin'),
  updateRolePermissions
);

export default router;
