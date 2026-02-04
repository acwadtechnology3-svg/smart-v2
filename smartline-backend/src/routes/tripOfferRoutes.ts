import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireDriver, requireCustomer } from '../middleware/rbac';
import { createTripOffer, rejectTripOffer, getTripOffers } from '../controllers/tripOfferController';

const router = Router();

router.get('/', authenticate, getTripOffers);
router.post('/', authenticate, requireDriver, createTripOffer);
router.post('/:offerId/reject', authenticate, requireCustomer, rejectTripOffer);

export default router;
