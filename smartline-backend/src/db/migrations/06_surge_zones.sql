-- Create Surge Zones Table (Honeycomb)
create table if not exists public.surge_zones (
  id uuid default gen_random_uuid() primary key,
  center_lat float8 not null,
  center_lng float8 not null,
  radius integer default 500, -- in meters
  multiplier numeric(3, 1) default 1.0, -- e.g. 1.5
  label text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.surge_zones enable row level security;

-- Drop existing policies
drop policy if exists "Enable read access for all" on public.surge_zones;
drop policy if exists "Enable write access for dashboard" on public.surge_zones;

-- Policies
create policy "Enable read access for all" on public.surge_zones
for select using (true);

create policy "Enable write access for dashboard" on public.surge_zones
for all using (true) with check (true);
