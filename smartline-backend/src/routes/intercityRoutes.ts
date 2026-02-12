import express from 'express';
// @ts-ignore
import { createTrip } from '../controllers/tripController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/request', authenticate, createTrip);

export default router;
