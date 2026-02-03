-- 1. Create a Secure Function to check admin status without triggering RLS loops
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This query runs with "Security Definer" privileges, bypassing RLS
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the Users Table Policy (Use the function instead of direct query)
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  -- Users can see themselves OR Admins can see everyone
  auth.uid() = id OR is_admin()
);

-- 3. Fix the Withdrawal Requests Policy (Use the function)
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests"
ON withdrawal_requests FOR SELECT
TO authenticated
USING (
  -- Drivers see own OR Admins see all
  driver_id = auth.uid() OR is_admin()
);
