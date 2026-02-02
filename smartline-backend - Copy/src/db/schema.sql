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
alter table public.trip_offers enable row level security;
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
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'driver-documents' );

create policy "Anon Upload"
on storage.objects for insert
with check ( bucket_id = 'driver-documents' );

-- ENABLE REALTIME
alter publication supabase_realtime add table trips;
alter publication supabase_realtime add table trip_offers;
alter publication supabase_realtime add table drivers;
