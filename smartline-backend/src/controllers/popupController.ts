import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Get active popup for consumption by the app
export const getActivePopup = async (req: Request, res: Response) => {
    try {
        const { role } = req.query; // 'customer' or 'driver'

        // Build query
        let query = supabase
            .from('app_popups')
            .select('id, title, image_url, target_role, is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (role && (role === 'customer' || role === 'driver')) {
            // We want popups that target ALL or the specific role
            query = query.in('target_role', ['all', role]);
        } else {
            // Default to all if no role provided (or maybe return nothing?)
            query = query.eq('target_role', 'all');
        }

        const { data, error } = await query.limit(1).single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error fetching active popup:', error);
            throw error;
        }

        res.json({ popup: data || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Get all popups
export const getPopups = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('app_popups')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ popups: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Create popup
export const createPopup = async (req: Request, res: Response) => {
    try {
        const { title, image_url, target_role, is_active } = req.body;

        // Basic validation
        if (!title || !image_url || !target_role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('app_popups')
            .insert({ title, image_url, target_role, is_active: is_active ?? true })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ popup: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Update popup
export const updatePopup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await supabase
            .from('app_popups')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ popup: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Delete popup
export const deletePopup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('app_popups')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
