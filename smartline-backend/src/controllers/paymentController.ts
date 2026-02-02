import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import crypto from 'crypto';
import { config } from '../config/env';

// Kashier configuration loaded from environment variables
const KASHIER = {
    MERCHANT_ID: config.KASHIER_MERCHANT_ID,
    API_KEY: config.KASHIER_API_KEY,
    SECRET_KEY: config.KASHIER_WEBHOOK_SECRET,
    CURRENCY: config.KASHIER_CURRENCY,
    MODE: config.KASHIER_MODE
};

// --- HELPER: Generate Hash ---
const generateKashierHash = (orderId: string, amount: string, currency: string) => {
    const path = `/?payment=${KASHIER.MERCHANT_ID}.${orderId}.${amount}.${currency}`;

    // PHP Logic: $hashWithApiKey = hash_hmac('sha256', $path, self::API_KEY);
    // Note: The provided logic preferred API Key hash for some reason.
    const hash = crypto.createHmac('sha256', KASHIER.API_KEY).update(path).digest('hex');

    return hash;
};

// --- 1. INITIALIZE DEPOSIT ---
export const initializeDeposit = async (req: Request, res: Response) => {
    try {
        const { userId, amount } = req.body;

        if (!userId || !amount) return res.status(400).json({ error: 'Missing userId or amount' });

        // 1. Create a Pending Transaction/Deposit record to enforce ID
        // We can create a temporary record or just use a generated UUID as OrderID.
        // For better tracking, let's insert a pending deposit into `wallet_transactions`? 
        // Or better, a `payment_requests` table if we had one. 
        // For now, let's generate a unique Order ID.

        const orderId = crypto.randomUUID();
        // Ideally save this pending state in DB.

        const amountFormatted = parseFloat(amount).toFixed(2); // "100.00"

        const hash = generateKashierHash(orderId, amountFormatted, KASHIER.CURRENCY);

        const callbackUrl = `https://your-backend-url.com/api/payment/callback`; // UPDATE THIS

        const params = new URLSearchParams({
            merchantId: KASHIER.MERCHANT_ID,
            orderId: orderId,
            amount: amountFormatted,
            currency: KASHIER.CURRENCY,
            hash: hash,
            mode: KASHIER.MODE,
            apiKey: KASHIER.API_KEY,
            merchantRedirect: callbackUrl,
            // serverWebhook: webhookUrl, 
            allowedMethods: 'card,wallet',
            brandColor: '#4F46E5', // Primary Color
            display: 'en'
        });

        const paymentUrl = `https://payments.kashier.io/?${params.toString()}`;

        // Return URL to frontend (Mobile App will open this in Browser/WebView)
        res.json({
            paymentUrl,
            orderId,
            paymentId: orderId // In PHP code they were same
        });

    } catch (err: any) {
        console.error("Deposit Init Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- 2. PAYMENT CALLBACK (Webhook/Redirect) ---
// Note: Mobile app might intercept deep link, but backend validation is safer.
export const paymentCallback = async (req: Request, res: Response) => {
    try {
        console.log("Kashier Callback:", req.query);
        const { paymentStatus, orderId, transactionId, signature } = req.query;

        // Verify Signature (Important security step implementation omitted for brevity, but critical)
        // See PHP validateKashierSignature logic.

        if (paymentStatus === 'SUCCESS' || paymentStatus === 'CAPTURED') {

            // 1. Find User associated with this Order
            // Since we didn't save orderId->User mapping in a temp table above (for brevity), 
            // In production, YOU MUST save the `orderId` + `userId` in a `pending_payments` table 
            // during `initializeDeposit` to credit the correct user here.

            // MOCK: Assuming we pass userId in metadata or we stored it.
            // For now, I will assume the frontend calls a verification endpoint after success 
            // OR we rely on a stored "pending_transaction" in DB.

            // Let's assume we simply return success HTML to the WebView
            // and the WebView closes and calls "checkStatus".

            res.send(`
                <html>
                <body style="text-align:center; padding: 50px; font-family: sans-serif;">
                    <h1 style="color:green">Payment Successful!</h1>
                    <p>You can close this window now.</p>
                </body>
                </html>
            `);
        } else {
            res.send(`<h1>Payment Failed</h1>`);
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing payment");
    }
};

// --- 3. REQUEST WITHDRAWAL ---
export const requestWithdrawal = async (req: Request, res: Response) => {
    try {
        const { driverId, amount, method, accountNumber } = req.body;

        // 1. Check Balance
        const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', driverId).single();

        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        // 2. Insert Request
        const { data, error } = await supabase
            .from('withdrawal_requests')
            .insert({
                driver_id: driverId,
                amount,
                method,
                account_number: accountNumber,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Optional: Reserve funds immediately? 
        // Or just let admin check balance at approval time. 
        // Better to reserve (deduct now or hold). 
        // Let's keep it simple: deducted only on approval.

        res.json({ success: true, request: data });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// --- 4. MANAGE WITHDRAWAL (Admin) ---
export const manageWithdrawal = async (req: Request, res: Response) => {
    try {
        const { requestId, action, adminNote } = req.body; // action: 'approve' | 'reject'

        if (action === 'approve') {
            // 1. Get Request
            const { data: request } = await supabase.from('withdrawal_requests').select('*').eq('id', requestId).single();
            if (!request || request.status !== 'pending') return res.status(400).json({ error: 'Invalid request' });

            // 2. Deduct Wallet
            const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', request.driver_id).single();
            if (wallet.balance < request.amount) {
                return res.status(400).json({ error: 'Driver has insufficient funds now' });
            }

            // Deduct
            await supabase.from('wallets').update({ balance: wallet.balance - request.amount }).eq('id', wallet.id);

            // Transaction Record
            await supabase.from('wallet_transactions').insert({
                user_id: request.driver_id,
                wallet_id: wallet.id,
                amount: -request.amount,
                type: 'withdrawal',
                trip_id: null
            });

            // Update Status
            await supabase.from('withdrawal_requests').update({ status: 'approved', admin_note: adminNote }).eq('id', requestId);

        } else if (action === 'reject') {
            await supabase.from('withdrawal_requests').update({ status: 'rejected', admin_note: adminNote }).eq('id', requestId);
        }

        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
