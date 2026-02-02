import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listMessages, sendMessage } from '../controllers/messageController';

const router = Router();

router.get('/', authenticate, listMessages);
router.post('/', authenticate, sendMessage);

export default router;
