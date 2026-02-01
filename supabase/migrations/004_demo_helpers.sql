-- Secure Helper to get a Demo Customer ID for testing
-- This function runs with SUPERUSER privileges (SECURITY DEFINER)
-- allowing unauthenticated users to fetch a valid ID for testing purposes.

create or replace function get_demo_customer()
returns uuid
language plpgsql
security definer
-- Set search path to ensure we use public schema
set search_path = public
as $$
declare
  demo_id uuid;
begin
  select id into demo_id
  from public.profiles
  where role = 'customer'
  limit 1;
  
  return demo_id;
end;
$$;

-- Grant access to public (anon)
grant execute on function get_demo_customer to public;
