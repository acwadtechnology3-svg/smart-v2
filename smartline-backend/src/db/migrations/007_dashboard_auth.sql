-- Create Dashboard Users Table (for Command Center)
-- This is separate from the public.users table which is for customers/drivers

CREATE TABLE IF NOT EXISTS public.dashboard_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text CHECK (role IN ('super_admin', 'admin', 'manager', 'viewer')) DEFAULT 'viewer' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by uuid REFERENCES public.dashboard_users(id)
);

-- Enable RLS for Dashboard Users
ALTER TABLE public.dashboard_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts when re-running)
DROP POLICY IF EXISTS "Enable all access for dashboard_users" ON public.dashboard_users;

-- Create Policy to allow all access (backend controls logic)
CREATE POLICY "Enable all access for dashboard_users" ON public.dashboard_users
FOR ALL USING (true) WITH CHECK (true);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_users_email ON public.dashboard_users(email);
CREATE INDEX IF NOT EXISTS idx_dashboard_users_role ON public.dashboard_users(role);
CREATE INDEX IF NOT EXISTS idx_dashboard_users_is_active ON public.dashboard_users(is_active);

-- Create permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS public.dashboard_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role text CHECK (role IN ('super_admin', 'admin', 'manager', 'viewer')) NOT NULL,
  page text NOT NULL, -- e.g., 'drivers', 'trips', 'customers', 'settings'
  can_view boolean DEFAULT false NOT NULL,
  can_create boolean DEFAULT false NOT NULL,
  can_edit boolean DEFAULT false NOT NULL,
  can_delete boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(role, page)
);

-- Enable RLS for Permissions
ALTER TABLE public.dashboard_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for dashboard_permissions" ON public.dashboard_permissions;
CREATE POLICY "Enable all access for dashboard_permissions" ON public.dashboard_permissions
FOR ALL USING (true) WITH CHECK (true);

-- Insert default permissions for each role
-- Super Admin: Full access to everything
INSERT INTO public.dashboard_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
('super_admin', 'dashboard', true, true, true, true),
('super_admin', 'drivers', true, true, true, true),
('super_admin', 'driver_requests', true, true, true, true),
('super_admin', 'trips', true, true, true, true),
('super_admin', 'customers', true, true, true, true),
('super_admin', 'wallet', true, true, true, true),
('super_admin', 'withdrawal_requests', true, true, true, true),
('super_admin', 'promos', true, true, true, true),
('super_admin', 'safety', true, true, true, true),
('super_admin', 'support', true, true, true, true),
('super_admin', 'settings', true, true, true, true),
('super_admin', 'members', true, true, true, true) -- Member management
ON CONFLICT (role, page) DO NOTHING;

-- Admin: Full access except member management
INSERT INTO public.dashboard_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'dashboard', true, true, true, true),
('admin', 'drivers', true, true, true, true),
('admin', 'driver_requests', true, true, true, true),
('admin', 'trips', true, true, true, true),
('admin', 'customers', true, true, true, true),
('admin', 'wallet', true, true, true, true),
('admin', 'withdrawal_requests', true, true, true, true),
('admin', 'promos', true, true, true, true),
('admin', 'safety', true, true, true, true),
('admin', 'support', true, true, true, true),
('admin', 'settings', true, true, true, false) -- Can edit but not delete settings
ON CONFLICT (role, page) DO NOTHING;

-- Manager: Can view and edit most things, limited create/delete
INSERT INTO public.dashboard_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
('manager', 'dashboard', true, false, true, false),
('manager', 'drivers', true, false, true, false),
('manager', 'driver_requests', true, true, true, false),
('manager', 'trips', true, false, true, false),
('manager', 'customers', true, false, true, false),
('manager', 'wallet', true, false, true, false),
('manager', 'withdrawal_requests', true, false, true, false),
('manager', 'promos', true, true, true, false),
('manager', 'safety', true, true, true, false),
('manager', 'support', true, true, true, false),
('manager', 'settings', true, false, false, false)
ON CONFLICT (role, page) DO NOTHING;

-- Viewer: View only access
INSERT INTO public.dashboard_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
('viewer', 'dashboard', true, false, false, false),
('viewer', 'drivers', true, false, false, false),
('viewer', 'driver_requests', true, false, false, false),
('viewer', 'trips', true, false, false, false),
('viewer', 'customers', true, false, false, false),
('viewer', 'wallet', true, false, false, false),
('viewer', 'withdrawal_requests', true, false, false, false),
('viewer', 'promos', true, false, false, false),
('viewer', 'safety', true, false, false, false),
('viewer', 'support', true, false, false, false),
('viewer', 'settings', false, false, false, false)
ON CONFLICT (role, page) DO NOTHING;
