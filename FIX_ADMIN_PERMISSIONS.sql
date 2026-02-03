-- 1. Update users table to allow 'admin' role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('customer', 'driver', 'admin', 'super_admin'));

-- 2. Add RLS policy for Admins to view ALL withdrawal requests
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests"
ON withdrawal_requests FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role IN ('admin', 'super_admin')
  )
);

-- 3. Add RLS policy for Admins to view ALL users (needed for the join)
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role IN ('admin', 'super_admin')
  )
);

-- 4. Add RLS policy for Admins to update withdrawal requests (if doing it from frontend)
-- (Though manageWithdrawal usually goes through backend API which uses service role)
-- But just in case:
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Admins can update withdrawal requests"
ON withdrawal_requests FOR UPDATE
TO authenticated
USING (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role IN ('admin', 'super_admin')
  )
);

-- 5. Ensure the dashboard user is actually an admin
-- Instructions: 
-- You must update your own user record to have role = 'admin'
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
