import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getWalletSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*, trips(pickup_address)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) throw txError;

    res.json({
      balance: user?.balance || 0,
      transactions: transactions || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
