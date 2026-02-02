import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createSosAlert } from '../controllers/sosController';

const router = Router();

router.post('/', authenticate, createSosAlert);

export default router;
