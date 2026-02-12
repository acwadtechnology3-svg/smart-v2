import express from 'express';
import {
    getActiveBanners,
    listBanners,
    createBanner,
    updateBanner,
    deleteBanner,
} from '../controllers/bannerController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = express.Router();

router.get('/active', getActiveBanners);

router.use(authenticate);

router.get('/', requireRole('super_admin', 'admin', 'manager'), listBanners);
router.post('/', requireRole('super_admin', 'admin'), createBanner);
router.put('/:id', requireRole('super_admin', 'admin'), updateBanner);
router.delete('/:id', requireRole('super_admin', 'admin'), deleteBanner);

export default router;
