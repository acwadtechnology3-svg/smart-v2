-- Create Support Tickets Table
create table if not exists public.support_tickets (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  subject text not null,
  status text not null default 'open'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint support_tickets_pkey primary key (id),
  constraint support_tickets_status_check check (
    (
      status = any (
        array['open'::text, 'closed'::text, 'resolved'::text]
      )
    )
  )
) TABLESPACE pg_default;

-- Create Support Messages Table
create table if not exists public.support_messages (
  id uuid not null default gen_random_uuid (),
  ticket_id uuid null,
  sender_id uuid null,
  message text not null,
  is_admin boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint support_messages_pkey primary key (id),
  constraint support_messages_ticket_id_fkey foreign KEY (ticket_id) references support_tickets (id) on delete CASCADE
) TABLESPACE pg_default;

-- Add RLS Policies (example)
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy "Users can view own tickets" on public.support_tickets
  for select using (auth.uid() = user_id);

create policy "Users can insert own tickets" on public.support_tickets
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tickets" on public.support_tickets
  for update using (auth.uid() = user_id);

create policy "Users can view messages for own tickets" on public.support_messages
  for select using (
    exists (
      select 1 from public.support_tickets
      where id = support_messages.ticket_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages for own tickets" on public.support_messages
  for insert with check (
    exists (
      select 1 from public.support_tickets
      where id = support_messages.ticket_id
      and user_id = auth.uid()
    )
  );
