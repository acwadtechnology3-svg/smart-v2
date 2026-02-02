
-- Create messages table for trip chat
create table messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  sender_id uuid references auth.users(id),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table messages enable row level security;

-- Policies
create policy "Trip participants can view messages"
  on messages for select using (
    exists (
      select 1 from trips 
      where trips.id = messages.trip_id 
      and (trips.customer_id = auth.uid() or trips.driver_id = auth.uid())
    )
  );

create policy "Trip participants can send messages"
  on messages for insert with check (
    exists (
      select 1 from trips 
      where trips.id = messages.trip_id 
      and (trips.customer_id = auth.uid() or trips.driver_id = auth.uid())
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table messages;
