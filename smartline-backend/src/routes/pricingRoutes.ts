import { Router } from 'express';
import { listPricingSettings, getPromoCode, getAvailablePromos } from '../controllers/pricingController';

const router = Router();

router.get('/settings', listPricingSettings);
router.get('/promo', getPromoCode);
router.get('/available', getAvailablePromos);


export default router;
