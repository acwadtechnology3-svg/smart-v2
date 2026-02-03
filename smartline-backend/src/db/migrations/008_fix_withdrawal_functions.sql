-- Simple withdrawal functions - no security restrictions for local development

DROP FUNCTION IF EXISTS public.approve_withdrawal(uuid, text);
DROP FUNCTION IF EXISTS public.reject_withdrawal(uuid, text);

CREATE OR REPLACE FUNCTION public.approve_withdrawal(
    req_id uuid,
    admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Get the withdrawal request
    SELECT * INTO rec
    FROM public.withdrawal_requests
    WHERE id = req_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal request not found';
    END IF;

    -- Update withdrawal request status
    UPDATE public.withdrawal_requests
    SET status = 'approved',
        admin_note = $2
    WHERE id = req_id;

    -- Deduct from user's balance in users table
    UPDATE public.users
    SET balance = balance - rec.amount
    WHERE id = rec.driver_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(
    req_id uuid,
    admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.withdrawal_requests
    SET status = 'rejected',
        admin_note = $2
    WHERE id = req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) TO anon, authenticated;
