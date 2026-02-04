import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const listPricingSettings = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('pricing_settings')
      .select('*')
      .order('service_tier', { ascending: true });

    if (error) throw error;

    res.json({ pricing: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getPromoCode = async (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string | undefined)?.trim();
    if (!code) return res.status(400).json({ error: 'code is required' });

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    if (!data.is_active) {
      return res.status(400).json({ error: 'Promo code is inactive' });
    }

    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      return res.status(400).json({ error: 'Promo code expired' });
    }

    if (data.max_uses && data.current_uses >= data.max_uses) {
      return res.status(400).json({ error: 'Promo code usage limit reached' });
    }

    // ... existing codes
    res.json({ promo: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAvailablePromos = async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();

    // Fetch active promos that haven't expired
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('is_active', true)
      .gt('valid_until', now)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out used up promos locally or in query if possible
    // (PostgREST doesn't support col comparison easily without raw sql or rpc, so filtering locally for simple cases)
    const validPromos = (data || []).filter(p =>
      !p.max_uses || (p.current_uses < p.max_uses)
    );

    res.json({ promos: validPromos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
