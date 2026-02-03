-- 1. Ensure withdrawal_requests table exists
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  account_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_driver ON withdrawal_requests(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);

-- 3. Ensure wallet_transactions handles direct user balance (no wallet_id dependency)
DO $$ 
BEGIN
    -- If wallet_id column exists, make it nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'wallet_id') THEN
        ALTER TABLE wallet_transactions ALTER COLUMN wallet_id DROP NOT NULL;
    END IF;

    -- Add description column if it doesn't exist (useful for withdrawal details)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'description') THEN
        ALTER TABLE wallet_transactions ADD COLUMN description TEXT;
    END IF;
END $$;
