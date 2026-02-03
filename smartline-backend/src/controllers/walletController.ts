import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getWalletSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Get Balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // 2. Get Wallet Transactions (Payments, Earnings)
    const { data: txs, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*') // Simplified query to avoid join errors for now
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) throw txError;

    // 3. Get Withdrawal Requests
    const { data: withdrawals, error: wdError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (wdError) throw wdError;

    // 4. Normalize & Merge
    // We want a unified list for the frontend.
    // Withdrawals in 'withdrawal_requests' might duplicate 'wallet_transactions' if we insert there too on approval.
    // However, pending requests are ONLY in withdrawal_requests.
    // So we should map them carefully.

    const normalTxs = (txs || []).map((t: any) => ({
      id: t.id,
      amount: t.amount,
      type: t.type, // 'trip_earnings', 'payment', etc.
      status: t.status,
      created_at: t.created_at,
      description: t.description || (t.trips ? `Trip to ${t.trips.pickup_address}` : '')
    }));

    const normalWithdrawals = (withdrawals || []).map((w: any) => ({
      id: w.id,
      amount: -w.amount, // Withdrawals are negative flows usually, or just show as red
      type: 'withdrawal_request',
      status: w.status, // 'pending', 'approved', 'rejected'
      created_at: w.created_at,
      description: `Withdrawal via ${w.method} (${w.status})`
    }));

    // Merge and Sort
    const allTransactions = [...normalTxs, ...normalWithdrawals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 4. Calculate Today's Earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTxs, error: todayError } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'trip_earnings')
      .gte('created_at', today.toISOString());

    if (todayError) console.error('Error fetching today earnings:', todayError);

    const todayEarnings = todayTxs?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

    res.json({
      balance: user?.balance || 0,
      today_earnings: todayEarnings,
      transactions: allTransactions.slice(0, 50), // Return last 50 combined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, method, account_number } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    if (!method || !account_number) {
      return res.status(400).json({ error: 'Payment method and account number are required' });
    }

    // Get current balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const currentBalance = Number(user?.balance || 0);

    // Check if user has sufficient balance
    if (currentBalance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        current_balance: currentBalance,
        requested_amount: amount
      });
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        driver_id: userId,
        amount,
        method,
        account_number,
        status: 'pending'
      })
      .select()
      .single();

    if (withdrawalError) throw withdrawalError;

    res.json({
      success: true,
      withdrawal,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
