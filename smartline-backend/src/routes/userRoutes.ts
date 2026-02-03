import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMe, updateProfile, deleteAccount } from '../controllers/userController';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.delete('/account', authenticate, deleteAccount);

export default router;
