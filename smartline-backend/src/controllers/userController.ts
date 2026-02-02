import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('users')
      .select('id, phone, full_name, email, role, balance, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
