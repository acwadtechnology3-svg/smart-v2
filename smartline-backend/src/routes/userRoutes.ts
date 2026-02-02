import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMe, updateProfile } from '../controllers/userController';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
