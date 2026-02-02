import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireDriver, requireCustomer } from '../middleware/rbac';
import { createTripOffer, rejectTripOffer } from '../controllers/tripOfferController';

const router = Router();

router.post('/', authenticate, requireDriver, createTripOffer);
router.post('/:offerId/reject', authenticate, requireCustomer, rejectTripOffer);

export default router;
