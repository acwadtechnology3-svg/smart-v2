import { Router } from 'express';
import { checkPhone, signup, login } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { checkPhoneSchema, signupSchema, loginSchema } from '../validators/schemas';

const router = Router();

// Public routes - no authentication required
router.post('/check-phone', validateBody(checkPhoneSchema), checkPhone);
router.post('/signup', validateBody(signupSchema), signup);
router.post('/login', validateBody(loginSchema), login);

export default router;
