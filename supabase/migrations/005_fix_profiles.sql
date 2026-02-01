-- 1. Ensure Profiles Table Exists
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  name text not null,
  email text,
  role text not null check (role in ('customer', 'driver')),
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. Enable RLS and Add Policy
alter table public.profiles enable row level security;

-- Drop existing policy to avoid error if it exists
drop policy if exists "Public read profiles" on public.profiles;

create policy "Public read profiles"
  on public.profiles for select
  using (true);

-- 3. Create Helper Function
create or replace function get_demo_customer()
returns uuid
language plpgsql
security definer
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

-- 4. Grant Access
grant execute on function get_demo_customer to public;
