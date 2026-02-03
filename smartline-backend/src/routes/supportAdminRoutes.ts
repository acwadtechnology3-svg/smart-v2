// No change intended, checking content first.
// If file content is correct, maybe just TS issue that needs restart.
// But I will re-verify the imports.
import express from 'express';
import { getAllTickets, getTicketDetails, adminReply, updateTicketStatus } from '../controllers/supportAdminController';

const router = express.Router();

router.get('/tickets', getAllTickets);
router.get('/tickets/:ticketId', getTicketDetails);
router.post('/tickets/:ticketId/reply', adminReply);
router.patch('/tickets/:ticketId/status', updateTicketStatus);

export default router;
