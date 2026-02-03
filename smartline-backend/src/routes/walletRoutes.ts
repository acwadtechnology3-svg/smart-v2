import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getWalletSummary, requestWithdrawal } from '../controllers/walletController';

const router = Router();

router.get('/summary', authenticate, getWalletSummary);
router.post('/withdraw', authenticate, requestWithdrawal);

export default router;
