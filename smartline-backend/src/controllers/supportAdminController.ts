import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getAllTickets = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        let query = supabase
            .from('support_tickets')
            .select(`
                *,
                users ( full_name, role )
            `)
            .order('updated_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: tickets, error } = await query;

        if (error) throw error;

        // Transform slightly for frontend convenience
        const formattedTickets = tickets.map(t => ({
            id: t.id,
            subject: t.subject,
            customerName: t.users?.full_name || 'Unknown',
            role: t.users?.role,
            status: t.status,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));

        res.json({ tickets: formattedTickets });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getTicketDetails = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;

        // Fetch ticket info
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('*, users(full_name, phone_number, role)')
            .eq('id', ticketId)
            .single();

        if (ticketError) throw ticketError;

        // Fetch messages
        const { data: messages, error: msgError } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        res.json({ ticket, messages });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const adminReply = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;
        // const adminId = req.user!.id; // Assuming admin is authenticated

        if (!message) return res.status(400).json({ error: 'Message required' });

        const { data: newMessage, error } = await supabase
            .from('support_messages')
            .insert({
                ticket_id: ticketId,
                // sender_id: adminId, // Optional if we just mark is_admin=true
                is_admin: true,
                message
            })
            .select('*')
            .single();

        if (error) throw error;

        // Update ticket to 'open' or 'replied'? 'open' is fine, or 'in-progress'.
        await supabase
            .from('support_tickets')
            .update({ updated_at: new Date().toISOString(), status: 'open' })
            .eq('id', ticketId);

        res.json({ message: newMessage });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!status) return res.status(400).json({ error: 'Status required' });

        const { data, error } = await supabase
            .from('support_tickets')
            .update({ status })
            .eq('id', ticketId)
            .select()
            .single();

        if (error) throw error;

        res.json({ ticket: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
