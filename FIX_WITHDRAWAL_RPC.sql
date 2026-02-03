-- Create a secure function to approve withdrawals atomically
CREATE OR REPLACE FUNCTION approve_withdrawal(req_id UUID, admin_note TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_request withdrawal_requests%ROWTYPE;
    v_user_balance NUMERIC;
    v_driver_id UUID;
BEGIN
    -- 1. Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- 2. Get the request
    SELECT * INTO v_request FROM withdrawal_requests WHERE id = req_id;
    
    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request is already %', v_request.status;
    END IF;

    v_driver_id := v_request.driver_id;

    -- 3. Check Driver Balance (Locking the row for update)
    SELECT balance INTO v_user_balance FROM users WHERE id = v_driver_id FOR UPDATE;

    IF v_user_balance IS NULL OR v_user_balance < v_request.amount THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;

    -- 4. Deduct Balance
    UPDATE users 
    SET balance = balance - v_request.amount 
    WHERE id = v_driver_id;

    -- 5. Create Transaction Record
    INSERT INTO wallet_transactions (user_id, amount, type, description, created_at)
    VALUES (v_driver_id, -v_request.amount, 'withdrawal', 'Withdrawal to ' || v_request.method, NOW());

    -- 6. Update Request Status
    UPDATE withdrawal_requests 
    SET status = 'approved', 
        admin_note = approve_withdrawal.admin_note,
        updated_at = NOW()
    WHERE id = req_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to Reject Withdrawal
CREATE OR REPLACE FUNCTION reject_withdrawal(req_id UUID, admin_note TEXT)
RETURNS JSONB AS $$
BEGIN
    -- 1. Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- 2. Update Status
    UPDATE withdrawal_requests 
    SET status = 'rejected', 
        admin_note = reject_withdrawal.admin_note,
        updated_at = NOW()
    WHERE id = req_id AND status = 'pending';

    IF NOT FOUND THEN
         RAISE EXCEPTION 'Request not found or not pending';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
