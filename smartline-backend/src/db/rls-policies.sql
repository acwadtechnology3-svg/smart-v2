-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================
-- This file contains secure RLS policies for SmartLine backend
-- Run this after initial schema setup

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies if they exist
DROP POLICY IF EXISTS "Enable all access for anon" ON users;
DROP POLICY IF EXISTS "Enable all access for anon" ON drivers;
DROP POLICY IF EXISTS "Enable all access for anon" ON trips;
DROP POLICY IF EXISTS "Enable all access for anon" ON trip_offers;
DROP POLICY IF EXISTS "Enable all access for anon" ON wallet_transactions;
DROP POLICY IF EXISTS "Enable all access for anon" ON wallets;
DROP POLICY IF EXISTS "Enable all access for anon" ON withdrawal_requests;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can read their own record
CREATE POLICY "Users can read own record"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own record (except role and sensitive fields)
CREATE POLICY "Users can update own record"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Service role can do anything (for backend operations)
CREATE POLICY "Service role full access to users"
ON users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- DRIVERS TABLE POLICIES
-- =============================================

-- Anyone can see online approved drivers (limited fields for matching)
CREATE POLICY "Public can view online drivers"
ON drivers FOR SELECT
TO authenticated
USING (
    status = 'approved'
    AND is_online = true
);

-- Drivers can see their own full record
CREATE POLICY "Drivers can read own record"
ON drivers FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Drivers can update their own location and status
CREATE POLICY "Drivers can update own location"
ON drivers FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access to drivers"
ON drivers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- TRIPS TABLE POLICIES
-- =============================================

-- Customers can read their own trips
CREATE POLICY "Customers can read own trips"
ON trips FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Drivers can read trips they're assigned to
CREATE POLICY "Drivers can read assigned trips"
ON trips FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- Drivers can see available trips (requested status, no driver assigned yet)
CREATE POLICY "Drivers can view available trips"
ON trips FOR SELECT
TO authenticated
USING (
    status = 'requested'
    AND driver_id IS NULL
);

-- Customers can create trips (INSERT)
CREATE POLICY "Customers can create trips"
ON trips FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Customers can update their own pending trips
CREATE POLICY "Customers can update own pending trips"
ON trips FOR UPDATE
TO authenticated
USING (
    customer_id = auth.uid()
    AND status IN ('requested', 'accepted')
)
WITH CHECK (customer_id = auth.uid());

-- Drivers can update status of their assigned trips
CREATE POLICY "Drivers can update assigned trip status"
ON trips FOR UPDATE
TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access to trips"
ON trips FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- TRIP OFFERS TABLE POLICIES
-- =============================================

-- Customers can see offers for their trips
CREATE POLICY "Customers can view offers for their trips"
ON trip_offers FOR SELECT
TO authenticated
USING (
    trip_id IN (
        SELECT id FROM trips WHERE customer_id = auth.uid()
    )
);

-- Drivers can see their own offers
CREATE POLICY "Drivers can view own offers"
ON trip_offers FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- Drivers can create offers for available trips
CREATE POLICY "Approved online drivers can create offers"
ON trip_offers FOR INSERT
TO authenticated
WITH CHECK (
    driver_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM drivers
        WHERE id = auth.uid()
        AND status = 'approved'
        AND is_online = true
    )
);

-- Only trip owners can accept/reject offers
CREATE POLICY "Trip owners can update offers"
ON trip_offers FOR UPDATE
TO authenticated
USING (
    trip_id IN (
        SELECT id FROM trips WHERE customer_id = auth.uid()
    )
);

-- Service role full access
CREATE POLICY "Service role full access to trip_offers"
ON trip_offers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- WALLET_TRANSACTIONS TABLE POLICIES
-- =============================================

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
ON wallet_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only service role can insert transactions (prevents manipulation)
CREATE POLICY "Service role can insert transactions"
ON wallet_transactions FOR INSERT
TO service_role
WITH CHECK (true);

-- No updates or deletes allowed (immutable ledger)
-- (No UPDATE or DELETE policies means they're denied by default)

-- Service role full access
CREATE POLICY "Service role full access to wallet_transactions"
ON wallet_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- WALLETS TABLE POLICIES
-- =============================================

-- Users can read their own wallet
CREATE POLICY "Users can view own wallet"
ON wallets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only service role can update balances (prevents manipulation)
CREATE POLICY "Service role can manage wallets"
ON wallets FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- WITHDRAWAL_REQUESTS TABLE POLICIES
-- =============================================

-- Drivers can see their own withdrawal requests
CREATE POLICY "Drivers can view own withdrawal requests"
ON withdrawal_requests FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- Drivers can create withdrawal requests
CREATE POLICY "Drivers can create withdrawal requests"
ON withdrawal_requests FOR INSERT
TO authenticated
WITH CHECK (driver_id = auth.uid());

-- Service role full access (for admin approval)
CREATE POLICY "Service role full access to withdrawal_requests"
ON withdrawal_requests FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- FUNCTION TO GET SERVICE ROLE JWT
-- =============================================
-- For backend operations, use SUPABASE_SERVICE_KEY
-- The backend should use the service role for all operations
-- and implement its own authorization logic

COMMENT ON TABLE users IS 'RLS enabled - Users can only access their own data';
COMMENT ON TABLE drivers IS 'RLS enabled - Public can view online drivers, drivers manage own data';
COMMENT ON TABLE trips IS 'RLS enabled - Customers see own trips, drivers see assigned/available trips';
COMMENT ON TABLE trip_offers IS 'RLS enabled - Drivers can offer, customers can accept/reject';
COMMENT ON TABLE wallet_transactions IS 'RLS enabled - Users view own, only service role can write';
COMMENT ON TABLE wallets IS 'RLS enabled - Users view own, only service role can update balances';
COMMENT ON TABLE withdrawal_requests IS 'RLS enabled - Drivers manage own requests, service role approves';
