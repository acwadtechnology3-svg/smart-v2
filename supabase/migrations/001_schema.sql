-- Enable PostGIS for geospatial queries
create extension if not exists postgis;

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  name text not null,
  email text,
  role text not null check (role in ('customer', 'driver')),
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Drivers
create table drivers (
  id uuid primary key references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  vehicle_type text check (vehicle_type in ('car', 'motorcycle', 'taxi')),
  vehicle_model text,
  vehicle_plate text,
  license_url text,
  photo_url text,
  vehicle_license_url text,
  declaration_url text,
  city text,
  current_lat double precision,
  current_lng double precision,
  is_online boolean default false,
  location geography(Point, 4326)
);

alter table drivers enable row level security;

create policy "Drivers can read own record"
  on drivers for select using (auth.uid() = id);
create policy "Drivers can update own record"
  on drivers for update using (auth.uid() = id);
create policy "Drivers can insert own record"
  on drivers for insert with check (auth.uid() = id);
create policy "Customers can read online approved drivers"
  on drivers for select using (is_online = true and status = 'approved');

-- Auto-update geography column when lat/lng change
create or replace function update_driver_location()
returns trigger as $$
begin
  if NEW.current_lat is not null and NEW.current_lng is not null then
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.current_lng, NEW.current_lat), 4326)::geography;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger driver_location_trigger
  before insert or update of current_lat, current_lng on drivers
  for each row execute function update_driver_location();

-- Wallets
create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  balance decimal(12,2) default 0.00
);

alter table wallets enable row level security;

create policy "Users can read own wallet"
  on wallets for select using (auth.uid() = user_id);
create policy "Users can update own wallet"
  on wallets for update using (auth.uid() = user_id);
create policy "Users can insert own wallet"
  on wallets for insert with check (auth.uid() = user_id);

-- Promo codes
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_percent integer not null default 0,
  discount_max decimal(12,2),
  valid_from timestamptz default now(),
  valid_until timestamptz,
  max_uses integer,
  current_uses integer default 0,
  is_active boolean default true
);

alter table promo_codes enable row level security;

create policy "Anyone can read active promo codes"
  on promo_codes for select using (is_active = true);

-- Trips
create table trips (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  driver_id uuid references profiles(id),
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text,
  dest_lat double precision not null,
  dest_lng double precision not null,
  dest_address text,
  status text not null default 'searching'
    check (status in ('searching','driver_found','driver_arriving','arrived','in_progress','completed','cancelled')),
  base_price decimal(12,2),
  final_price decimal(12,2),
  driver_price_adjustment decimal(12,2) default 0,
  payment_method text default 'cash' check (payment_method in ('cash', 'wallet')),
  promo_code_id uuid references promo_codes(id),
  discount_amount decimal(12,2) default 0,
  distance_km decimal(8,2),
  duration_min integer,
  driver_current_lat double precision,
  driver_current_lng double precision,
  rating integer check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table trips enable row level security;

create policy "Customers can read own trips"
  on trips for select using (auth.uid() = customer_id);
create policy "Drivers can read assigned trips"
  on trips for select using (auth.uid() = driver_id);
create policy "Customers can insert trips"
  on trips for insert with check (auth.uid() = customer_id);
create policy "Trip participants can update"
  on trips for update using (auth.uid() = customer_id or auth.uid() = driver_id);
-- Drivers can see searching trips (for matching)
create policy "Online drivers can see searching trips"
  on trips for select using (
    status = 'searching' and exists (
      select 1 from drivers where drivers.id = auth.uid() and drivers.is_online = true and drivers.status = 'approved'
    )
  );

-- Enable realtime on trips
alter publication supabase_realtime add table trips;

-- Wallet transactions
create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id),
  amount decimal(12,2) not null,
  type text not null check (type in ('deposit', 'payment', 'refund')),
  trip_id uuid references trips(id),
  created_at timestamptz default now()
);

alter table wallet_transactions enable row level security;

create policy "Users can read own transactions"
  on wallet_transactions for select using (
    exists (select 1 from wallets where wallets.id = wallet_id and wallets.user_id = auth.uid())
  );
create policy "Users can insert own transactions"
  on wallet_transactions for insert with check (
    exists (select 1 from wallets where wallets.id = wallet_id and wallets.user_id = auth.uid())
  );

-- Function to find nearby drivers
create or replace function find_nearby_drivers(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer default 5000
)
returns setof drivers as $$
begin
  return query
    select *
    from drivers
    where is_online = true
      and status = 'approved'
      and location is not null
      and ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_meters
      )
    order by ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    );
end;
$$ language plpgsql;

-- Function to process trip payment
create or replace function process_trip_payment(p_trip_id uuid)
returns void as $$
declare
  v_trip trips%rowtype;
  v_wallet wallets%rowtype;
begin
  select * into v_trip from trips where id = p_trip_id;

  if v_trip.payment_method = 'wallet' then
    select * into v_wallet from wallets where user_id = v_trip.customer_id;

    if v_wallet.balance < v_trip.final_price then
      raise exception 'Insufficient wallet balance';
    end if;

    update wallets set balance = balance - v_trip.final_price where user_id = v_trip.customer_id;

    insert into wallet_transactions (wallet_id, amount, type, trip_id)
    values (v_wallet.id, -v_trip.final_price, 'payment', p_trip_id);
  end if;
end;
$$ language plpgsql;

-- Auto-update updated_at on trips
create or replace function update_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trips_updated_at
  before update on trips
  for each row execute function update_updated_at();

-- Admin role support
create table admin_users (
  id uuid primary key references auth.users(id),
  created_at timestamptz default now()
);

-- Admin policies (allows admins to read/update all)
create policy "Admins can read all profiles"
  on profiles for select using (
    exists (select 1 from admin_users where id = auth.uid())
  );
create policy "Admins can read all drivers"
  on drivers for all using (
    exists (select 1 from admin_users where id = auth.uid())
  );
create policy "Admins can manage promo codes"
  on promo_codes for all using (
    exists (select 1 from admin_users where id = auth.uid())
  );
create policy "Admins can read all trips"
  on trips for select using (
    exists (select 1 from admin_users where id = auth.uid())
  );
