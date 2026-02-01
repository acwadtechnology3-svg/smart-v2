import { Router } from 'express';
import { createTrip, getTripStatus, acceptTripOffer, updateTripStatus } from '../controllers/tripController';

const router = Router();

router.post('/create', createTrip);
router.post('/accept-offer', acceptTripOffer);
router.post('/update-status', updateTripStatus);
router.get('/:tripId', getTripStatus);

export default router;
