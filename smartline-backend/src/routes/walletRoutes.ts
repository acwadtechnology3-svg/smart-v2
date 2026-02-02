import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getWalletSummary } from '../controllers/walletController';

const router = Router();

router.get('/summary', authenticate, getWalletSummary);

export default router;
