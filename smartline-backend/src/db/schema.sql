-- Create Users Table (Custom Auth)
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  password_hash text not null,
  full_name text,
  email text,
  role text check (role in ('customer', 'driver')) default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- IMPORTANT: Enable Public Access for this Custom Auth flow
-- (Since we are using the Anon key with a custom backend)
alter table public.users enable row level security;

-- Drop existing policy if any (to avoid conflicts when re-running)
drop policy if exists "Enable all access for anon" on public.users;

-- Create Policy to allow Insert/Select/Update/Delete for everyone (since our Backend controls logic)
create policy "Enable all access for anon" on public.users
for all using (true) with check (true);

-- Create Trips Table
create table if not exists public.trips (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.users(id) not null,
  driver_id uuid references public.users(id),
  pickup_lat float8 not null,
  pickup_lng float8 not null,
  dest_lat float8 not null,
  dest_lng float8 not null,
  pickup_address text,
  dest_address text,
  status text check (status in ('requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled')) default 'requested',
  price numeric not null,
  distance numeric,
  duration numeric,
  car_type text,
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Trips
alter table public.trips enable row level security;

-- Drop existing policy if any
drop policy if exists "Enable all access for anon trips" on public.trips;

-- Create Policy for Trips
-- Create Policy for Trips
create policy "Enable all access for anon trips" on public.trips
for all using (true) with check (true);


-- Create Drivers Table
create table if not exists public.drivers (
  id uuid references public.users(id) primary key,
  national_id text,
  city text,
  vehicle_type text,
  vehicle_model text,
  vehicle_plate text,
  status text check (status in ('pending', 'approved', 'rejected', 'banned')) default 'pending',
  
  profile_photo_url text,
  id_front_url text,
  id_back_url text,
  license_front_url text,
  license_back_url text,
  vehicle_front_url text,
  vehicle_back_url text,
  vehicle_right_url text,
  vehicle_left_url text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Online Status & Location
  is_online boolean default false,
  current_lat float8,
  current_lng float8,
  last_location_update timestamp with time zone,
  rating numeric default 5.0
);

-- Create Trip Offers Table (For Bidding)
create table if not exists public.trip_offers (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) not null,
  driver_id uuid references public.drivers(id) not null,
  offer_price numeric not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Trip Offers
-- Enable RLS for Trip Offers
alter table public.trip_offers enable row level security;

-- Drop existing policy if any
drop policy if exists "Enable all access for anon offers" on public.trip_offers;

create policy "Enable all access for anon offers" on public.trip_offers
for all using (true) with check (true);

-- Enable RLS for Drivers
alter table public.drivers enable row level security;

-- Drop existing policy if any
drop policy if exists "Enable all access for anon drivers" on public.drivers;

-- Create Policy for Drivers
create policy "Enable all access for anon drivers" on public.drivers
for all using (true) with check (true);

-- Create Storage Bucket 'driver-documents' if not exists
-- Only works if storage schema is accessible and RLS allows it, otherwise do this in Dashbaord
insert into storage.buckets (id, name, public)
values ('driver-documents', 'driver-documents', true)
on conflict (id) do nothing;

-- Allow public access to 'driver-documents' bucket
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'driver-documents' );

drop policy if exists "Anon Upload" on storage.objects;
create policy "Anon Upload"
on storage.objects for insert
with check ( bucket_id = 'driver-documents' );

-- ENABLE REALTIME
do $$
begin
  alter publication supabase_realtime add table trips;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table trip_offers;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table drivers;
exception
  when duplicate_object then null;
end $$;

-- Create Dashboard Users Table (for Command Center)
create table if not exists public.dashboard_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  role text check (role in ('super_admin', 'admin', 'manager', 'viewer')) default 'viewer' not null,
  is_active boolean default true not null,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.dashboard_users(id)
);

-- Enable RLS for Dashboard Users
alter table public.dashboard_users enable row level security;

-- Drop existing policy if any
drop policy if exists "Enable all access for dashboard_users" on public.dashboard_users;

-- Create Policy for Dashboard Users
create policy "Enable all access for dashboard_users" on public.dashboard_users
for all using (true) with check (true);

-- Create Dashboard Permissions Table
create table if not exists public.dashboard_permissions (
  id uuid default gen_random_uuid() primary key,
  role text check (role in ('super_admin', 'admin', 'manager', 'viewer')) not null,
  page text not null,
  can_view boolean default false not null,
  can_create boolean default false not null,
  can_edit boolean default false not null,
  can_delete boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(role, page)
);

-- Enable RLS for Permissions
alter table public.dashboard_permissions enable row level security;

drop policy if exists "Enable all access for dashboard_permissions" on public.dashboard_permissions;
create policy "Enable all access for dashboard_permissions" on public.dashboard_permissions
for all using (true) with check (true);


-- Add balance to users if not exists
alter table public.users add column if not exists balance numeric default 0.00;

-- Create Wallet Transactions Table
create table if not exists public.wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  amount numeric not null,
  type text check (type in ('deposit', 'withdrawal', 'trip_earnings', 'payment', 'refund', 'fee')) not null,
  status text check (status in ('pending', 'completed', 'failed')) default 'completed',
  description text,
  trip_id uuid references public.trips(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Wallet Transactions
alter table public.wallet_transactions enable row level security;

drop policy if exists 'Enable all access for anon transactions' on public.wallet_transactions;
create policy 'Enable all access for anon transactions' on public.wallet_transactions
for all using (true) with check (true);

-- Realtime for Wallet
do $$
begin
  alter publication supabase_realtime add table wallet_transactions;
exception
  when duplicate_object then null;
end $$;

