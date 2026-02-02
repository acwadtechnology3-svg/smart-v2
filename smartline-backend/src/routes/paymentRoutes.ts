import { Router } from 'express';
import { initializeDeposit, paymentCallback, requestWithdrawal, manageWithdrawal } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { requireDriver, requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { depositInitSchema, withdrawRequestSchema, withdrawManageSchema } from '../validators/schemas';

const router = Router();

// Deposit endpoints - authenticated users only
router.post(
  '/deposit/init',
  authenticate,
  validateBody(depositInitSchema),
  initializeDeposit
);

// Payment callback - public (called by Kashier)
// No authentication required as this comes from external service
router.get('/callback', paymentCallback);

// Withdrawal requests - drivers only
router.post(
  '/withdraw/request',
  authenticate,
  requireDriver,
  validateBody(withdrawRequestSchema),
  requestWithdrawal
);

// Manage withdrawals - admin only
router.post(
  '/withdraw/manage',
  authenticate,
  requireAdmin,
  validateBody(withdrawManageSchema),
  manageWithdrawal
);

export default router;
