import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Public: Get active surge zones (Honeycomb)
export const getActiveSurgeZones = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('surge_zones')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        res.json({ zones: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Get all zones
export const getSurgeZones = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('surge_zones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ zones: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Create zone
export const createSurgeZone = async (req: Request, res: Response) => {
    try {
        const { center_lat, center_lng, radius, multiplier, label, is_active } = req.body;

        if (!center_lat || !center_lng || !multiplier) {
            return res.status(400).json({ error: 'Missing req fields' });
        }

        const { data, error } = await supabase
            .from('surge_zones')
            .insert({
                center_lat,
                center_lng,
                radius: radius || 500,
                multiplier,
                label,
                is_active: is_active ?? true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ zone: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Update zone
export const updateSurgeZone = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await supabase
            .from('surge_zones')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ zone: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Delete zone
export const deleteSurgeZone = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('surge_zones')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
