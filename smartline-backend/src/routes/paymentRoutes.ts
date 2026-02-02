import { Router } from 'express';
import { initializeDeposit, paymentCallback, requestWithdrawal, manageWithdrawal } from '../controllers/paymentController';

const router = Router();

// Payment Gateways
router.post('/deposit/init', initializeDeposit);
router.get('/callback', paymentCallback); // Kashier redirects here via GET

// Withdrawals
router.post('/withdraw/request', requestWithdrawal);
router.post('/withdraw/manage', manageWithdrawal); // Admin only

export default router;
