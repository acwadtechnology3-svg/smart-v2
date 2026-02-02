import { Router } from 'express';
import { listPricingSettings, getPromoCode } from '../controllers/pricingController';

const router = Router();

router.get('/settings', listPricingSettings);
router.get('/promo', getPromoCode);

export default router;
