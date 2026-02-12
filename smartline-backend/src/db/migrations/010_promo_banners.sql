-- Promo banners shown in customer/driver apps
create table if not exists public.promo_banners (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    subtitle text,
    image_url text,
    action_type text not null check (action_type in ('link', 'screen', 'refer')),
    action_value text,
    target_role text not null default 'all' check (target_role in ('all', 'customer', 'driver')),
    display_order integer not null default 0,
    is_active boolean not null default true,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists idx_promo_banners_active on public.promo_banners (is_active, display_order);
create index if not exists idx_promo_banners_target on public.promo_banners (target_role);

-- trigger for updated_at
create or replace function public.set_promo_banners_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger trg_promo_banners_updated_at
before update on public.promo_banners
for each row execute function public.set_promo_banners_updated_at();

-- Enable RLS
alter table public.promo_banners enable row level security;

drop policy if exists promo_banners_select_all on public.promo_banners;
drop policy if exists promo_banners_manage on public.promo_banners;

create policy promo_banners_select_all on public.promo_banners
for select using (true);

create policy promo_banners_manage on public.promo_banners
for all using (true) with check (true);
