import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const createTicket = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { subject } = req.body;

        if (!subject) {
            return res.status(400).json({ error: 'Subject is required' });
        }

        const { data: ticket, error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: userId,
                subject,
                status: 'open'
            })
            .select('*')
            .single();

        if (error) throw error;

        res.json({ ticket });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getMyTickets = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        const { data: tickets, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json({ tickets });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getTicketMessages = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user!.id;

        // Security check: Ensure ticket belongs to user (or user is admin - logic simplified for user only here)
        const { data: ticket } = await supabase
            .from('support_tickets')
            .select('user_id')
            .eq('id', ticketId)
            .single();

        if (!ticket || ticket.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: messages, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true }); // Chat order

        if (error) throw error;

        res.json({ messages });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user!.id;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Security check
        const { data: ticket } = await supabase
            .from('support_tickets')
            .select('user_id')
            .eq('id', ticketId)
            .single();

        if (!ticket || ticket.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: newMessage, error } = await supabase
            .from('support_messages')
            .insert({
                ticket_id: ticketId,
                sender_id: userId,
                message,
                is_admin: false
            })
            .select('*')
            .single();

        if (error) throw error;

        // Update ticket updated_at
        await supabase
            .from('support_tickets')
            .update({ updated_at: new Date().toISOString(), status: 'open' }) // Re-open if closed? Usually sends updates
            .eq('id', ticketId);

        res.json({ message: newMessage });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
