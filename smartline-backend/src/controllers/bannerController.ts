import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const ALLOWED_ACTION_TYPES = ['link', 'screen', 'refer'];
const ALLOWED_TARGET_ROLES = ['all', 'customer', 'driver'];

const buildPayload = (body: any, requireTitle = true) => {
    const {
        title,
        subtitle,
        image_url,
        action_type,
        action_value,
        target_role = 'all',
        display_order = 0,
        is_active = true,
        starts_at,
        ends_at,
    } = body;

    if (requireTitle && !title) {
        throw new Error('Title is required');
    }

    if (!ALLOWED_ACTION_TYPES.includes(action_type)) {
        throw new Error('Invalid action type');
    }

    if (!ALLOWED_TARGET_ROLES.includes(target_role)) {
        throw new Error('Invalid target role');
    }

    if (action_type === 'link' && !action_value) {
        throw new Error('action_value (URL) is required for link banners');
    }

    if (action_type === 'screen' && !action_value) {
        throw new Error('action_value (screen name) is required for screen banners');
    }

    return {
        title,
        subtitle,
        image_url,
        action_type,
        action_value,
        target_role,
        display_order,
        is_active,
        starts_at,
        ends_at,
    };
};

export const getActiveBanners = async (req: Request, res: Response) => {
    try {
        const role = (req.query.role as string) || 'customer';
        const now = new Date().toISOString();

        let query = supabase
            .from('promo_banners')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (role === 'driver') {
            query = query.in('target_role', ['all', 'driver']);
        } else {
            query = query.in('target_role', ['all', 'customer']);
        }

        query = query.or(`ends_at.is.null,ends_at.gt.${now}`);
        query = query.or(`starts_at.is.null,starts_at.lte.${now}`);

        const { data, error } = await query;

        if (error) throw error;

        res.json({ banners: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const listBanners = async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('promo_banners')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ banners: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const createBanner = async (req: Request, res: Response) => {
    try {
        const payload = buildPayload(req.body);

        const { data, error } = await supabase
            .from('promo_banners')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ banner: data });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const updateBanner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const payload = buildPayload({ ...req.body, title: req.body.title ?? '' }, false);

        const { data, error } = await supabase
            .from('promo_banners')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ banner: data });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteBanner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('promo_banners')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
