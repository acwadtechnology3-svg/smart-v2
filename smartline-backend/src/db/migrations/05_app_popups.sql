-- Create Popups Table for Announcements
create table if not exists public.app_popups (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  image_url text not null,
  target_role text check (target_role in ('all', 'customer', 'driver')) not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.app_popups enable row level security;

-- Drop existing policies
drop policy if exists "Enable read access for all" on public.app_popups;
drop policy if exists "Enable write access for dashboard" on public.app_popups;

-- Policies
create policy "Enable read access for all" on public.app_popups
for select using (true);

create policy "Enable write access for dashboard" on public.app_popups
for all using (true) with check (true);
