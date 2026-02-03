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

drop policy if exists "Enable all access for anon transactions" on public.wallet_transactions;
create policy "Enable all access for anon transactions" on public.wallet_transactions
for all using (true) with check (true);

-- Realtime for Wallet
do $$
begin
  alter publication supabase_realtime add table wallet_transactions;
exception
  when duplicate_object then null;
end $$;
