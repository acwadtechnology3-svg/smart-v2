-- Create SOS Alerts Table
create table sos_alerts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  reporter_id uuid references auth.users(id),
  latitude double precision not null,
  longitude double precision not null,
  status text default 'pending' check (status in ('pending', 'investigating', 'resolved', 'false_alarm')),
  metadata jsonb default '{}'::jsonb, -- flexible field for extra context
  created_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table sos_alerts;

-- RLS Policies
alter table sos_alerts enable row level security;

-- Everyone can insert (if authenticated)
create policy "Users can report SOS"
  on sos_alerts for insert
  with check (auth.uid() = reporter_id);

-- Only admins should view all, but for now allow reporters to view their own
create policy "Users can view their own SOS"
  on sos_alerts for select
  using (auth.uid() = reporter_id);
  
-- Admins/Support (if we had role based access) would have a policy here.
-- For now, maybe allow read access to everyone for the dashboard demo?
create policy "Public read access for dashboard demo"
  on sos_alerts for select
  using (true);
