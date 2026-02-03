-- Insert Super Admin User
-- Run this SQL to create the super admin

INSERT INTO public.dashboard_users (
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'salahezzat120@gmail.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', -- bcrypt hash of '12345678'
  'Salah Ezzat',
  'super_admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();
