import { Router } from 'express';
import { checkPhone, signup, login } from '../controllers/authController';

const router = Router();

router.post('/check-phone', checkPhone);
router.post('/signup', signup);
router.post('/login', login);

export default router;
