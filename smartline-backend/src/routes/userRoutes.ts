import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMe } from '../controllers/userController';

const router = Router();

router.get('/me', authenticate, getMe);

export default router;
