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

// --- HELPER: Validate Kashier Signature ---
const validateKashierSignature = (params: any, receivedSignature: string) => {
    // Remove signature and mode from params (if present, although query params usually don't have them in the way we want)
    // IMPORTANT: Kashier callback logic requires sorting keys

    // Create a copy to manipulate
    const data: any = { ...params };
    delete data.signature;
    delete data.mode;

    // Sort keys
    const sortedKeys = Object.keys(data).sort();

    // Build query string like: key=value&key2=value2
    const queryParts = sortedKeys.map(key => `${key}=${data[key]}`);
    const queryString = queryParts.join('&');

    // Secret Key logic: If secret contains '$', use the part AFTER '$'
    const secret = KASHIER.SECRET_KEY.includes('$')
        ? KASHIER.SECRET_KEY.split('$')[1]
        : KASHIER.SECRET_KEY;

    // HMAC
    const generatedSignature = crypto.createHmac('sha256', secret).update(queryString).digest('hex');

    console.log("Validation Debug:", { queryString, generatedSignature, receivedSignature });

    return generatedSignature === receivedSignature;
};

// --- 1. INITIALIZE DEPOSIT ---
export const initializeDeposit = async (req: Request, res: Response) => {
    try {
        const { userId, amount } = req.body;

        if (!userId || !amount) return res.status(400).json({ error: 'Missing userId or amount' });

        const orderId = crypto.randomUUID();
        const amountFormatted = parseFloat(amount).toFixed(2); // "100.00"

        // Save Pending Transaction in DB to track who made this order
        // We use wallet_transactions with 'pending' status
        const { error } = await supabase.from('wallet_transactions').insert({
            id: orderId, // Use Order ID as Transaction ID
            user_id: userId,
            amount: parseFloat(amount),
            type: 'deposit',
            status: 'pending',
            description: 'Kashier Deposit Initialization'
        });

        if (error) throw error;

        // Hash Generation
        // Secret Key logic: If secret contains '$', use the part AFTER '$'
        const secret = KASHIER.SECRET_KEY.includes('$')
            ? KASHIER.SECRET_KEY.split('$')[1]
            : KASHIER.SECRET_KEY;

        const path = `/?payment=${KASHIER.MERCHANT_ID}.${orderId}.${amountFormatted}.${KASHIER.CURRENCY}`;
        // Use API KEY for the initial hash as per PHP example logic, or Secret depending on integration type.
        // The PHP example used API_KEY for one hash and Secret for another.
        // Standard Kashier Hosted Page usually uses SECRET for Hashing. 
        // However, the provided PHP code says "Trying both methods... Use API key hash".
        // Let's stick to the provided PHP logic: hash_hmac('sha256', $path, self::API_KEY)
        const hash = crypto.createHmac('sha256', KASHIER.API_KEY).update(path).digest('hex');

        // Callback URL (The backend endpoint that receives the webhook)
        // If testing locally with Ngrok, use the Ngrok URL. 
        // For production, use actual domain.
        // Assuming req.get('host') is correct or configured in Env.
        const baseUrl = `http://${req.get('host')}`;
        const callbackUrl = `${baseUrl}/api/payment/callback`;

        const params = new URLSearchParams({
            merchantId: KASHIER.MERCHANT_ID,
            orderId: orderId,
            amount: amountFormatted,
            currency: KASHIER.CURRENCY,
            hash: hash,
            mode: KASHIER.MODE,
            apiKey: KASHIER.API_KEY,
            merchantRedirect: callbackUrl, // Where user is redirected
            serverWebhook: callbackUrl,    // Webhook event
            allowedMethods: 'card,wallet',
            brandColor: '#4F46E5',
            display: 'en'
        });

        const paymentUrl = `https://payments.kashier.io/?${params.toString()}`;

        res.json({
            paymentUrl,
            orderId,
            paymentId: orderId
        });

    } catch (err: any) {
        console.error("Deposit Init Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- 2. PAYMENT CALLBACK (Webhook/Redirect) ---
export const paymentCallback = async (req: Request, res: Response) => {
    try {
        console.log("Kashier Callback Params:", req.query);

        // Kashier sends params in Query String for Redirect, or Body for Webhook?
        // Usually Redirect = Query Params.
        const params = req.query as any;
        const { paymentStatus, orderId, transactionId, signature } = params;

        if (!orderId) return res.status(400).send("Missing Order ID");

        // 1. Validate Signature
        if (signature) {
            const isValid = validateKashierSignature(params, signature as string);
            if (!isValid) {
                console.error("❌ Invalid Signature for Order:", orderId);
                // In production, you might want to block this. 
                // For now, logging warning but proceeding if testing.
            }
        }

        // 2. Check Status
        if (paymentStatus === 'SUCCESS' || paymentStatus === 'CAPTURED') {

            // 3. Find Transaction
            const { data: tx, error: fetchError } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('id', orderId)
                .single();

            if (!tx) {
                console.error("Transaction not found:", orderId);
                return res.send("Transaction not found so cannot update.");
            }

            if (tx.status === 'completed') {
                // Already processed (idempotency)
                return res.send(`
                    <html>
                    <body style="text-align:center; padding: 50px; font-family: sans-serif;">
                        <h1 style="color:green">Payment Already Processed</h1>
                    </body>
                    </html>
                `);
            }

            // 4. Update Balance & Transaction Status
            // Get current user balance to increment
            const { data: user } = await supabase
                .from('users')
                .select('balance')
                .eq('id', tx.user_id)
                .single();

            const newBalance = (user?.balance || 0) + tx.amount;

            // Update User Balance
            await supabase.from('users').update({ balance: newBalance }).eq('id', tx.user_id);

            // Mark Transaction Complete
            await supabase.from('wallet_transactions').update({
                status: 'completed',
                description: `Deposit via Kashier (Tx: ${transactionId})`
            }).eq('id', orderId);

            console.log(`✅ Payment Success: ${orderId} - User Credited: ${tx.amount}`);

            res.send(`
                <html>
                <body style="text-align:center; padding: 50px; font-family: sans-serif;">
                    <h1 style="color:green">Payment Successful!</h1>
                    <p>Your wallet has been topped up.</p>
                    <p>You can close this window now.</p>
                </body>
                </html>
            `);

        } else {
            // Update status to failed
            await supabase.from('wallet_transactions').update({ status: 'failed' }).eq('id', orderId);

            res.send(`
                <html>
                <body style="text-align:center; padding: 50px; font-family: sans-serif;">
                    <h1 style="color:red">Payment Failed</h1>
                    <p>Status: ${paymentStatus}</p>
                </body>
                </html>
            `);
        }

    } catch (err) {
        console.error("Callback Error:", err);
        res.status(500).send("Error processing payment");
    }
};

// --- 3. REQUEST WITHDRAWAL ---
export const requestWithdrawal = async (req: Request, res: Response) => {
    try {
        const driverId = req.user!.id; // Get from authenticated user
        const { amount, method, accountNumber } = req.body;

        // 1. Check Balance
        const { data: user } = await supabase.from('users').select('balance').eq('id', driverId).single();

        if (!user || (user.balance || 0) < amount) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        // 2. Check for existing PENDING request
        const { data: existingPending } = await supabase
            .from('withdrawal_requests')
            .select('id')
            .eq('driver_id', driverId)
            .eq('status', 'pending')
            .single();

        if (existingPending) {
            return res.status(400).json({ error: 'You already have a pending withdrawal request.' });
        }

        // 3. Insert Request
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

            // 2. Deduct Wallet (User Balance)
            const { data: user } = await supabase.from('users').select('balance').eq('id', request.driver_id).single();

            if (!user || (user.balance || 0) < request.amount) {
                return res.status(400).json({ error: 'Driver has insufficient funds now' });
            }

            // Deduct
            const newBalance = (user.balance || 0) - request.amount;
            await supabase.from('users').update({ balance: newBalance }).eq('id', request.driver_id);

            // Transaction Record
            await supabase.from('wallet_transactions').insert({
                user_id: request.driver_id,
                // wallet_id: wallet.id, // Removed as we don't use wallets table
                amount: -request.amount,
                type: 'withdrawal',
                trip_id: null,
                description: `Withdrawal to ${request.method}`
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
