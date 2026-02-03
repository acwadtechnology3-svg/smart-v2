import express from 'express';
import { authenticate } from '../middleware/auth';
import { createTicket, getMyTickets, getTicketMessages, sendMessage } from '../controllers/supportController';

const router = express.Router();

router.use(authenticate);

// Tickets
router.post('/tickets', createTicket);
router.get('/tickets', getMyTickets);

// Messages
router.get('/tickets/:ticketId/messages', getTicketMessages);
router.post('/tickets/:ticketId/messages', sendMessage);

export default router;
