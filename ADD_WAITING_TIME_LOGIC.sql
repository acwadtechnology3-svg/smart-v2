-- Add timestamps for accurate waiting time calc
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS arrived_at timestamptz;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS waiting_cost numeric DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS final_price numeric; -- Ensure final_price exists

-- Ensure pricing_settings exists and has correct columns
CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    service_tier text UNIQUE NOT NULL,
    base_fare numeric NOT NULL DEFAULT 10,
    per_km_rate numeric NOT NULL DEFAULT 5, -- Fixed name
    per_min_rate numeric NOT NULL DEFAULT 1, -- Fixed name
    waiting_price_per_min numeric NOT NULL DEFAULT 2, -- New column
    minimum_trip_price numeric NOT NULL DEFAULT 20, -- Fixed name
    platform_fee_percent numeric NOT NULL DEFAULT 15,
    created_at timestamptz DEFAULT now()
);

-- Add waiting_price_per_min if table existed but missed it
ALTER TABLE public.pricing_settings ADD COLUMN IF NOT EXISTS waiting_price_per_min numeric DEFAULT 2;

-- Enable RLS
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Pricing" ON public.pricing_settings;
CREATE POLICY "Public Read Pricing" ON public.pricing_settings FOR SELECT USING (true);

-- INSERT DEFAULT VALUES if empty (Updating with correct column names)
INSERT INTO public.pricing_settings (service_tier, base_fare, per_km_rate, per_min_rate, waiting_price_per_min, minimum_trip_price, platform_fee_percent)
VALUES 
('economy', 15, 6, 1.5, 3.0, 25, 15),
('comfort', 25, 9, 2.5, 5.0, 40, 20)
ON CONFLICT (service_tier) DO UPDATE SET waiting_price_per_min = EXCLUDED.waiting_price_per_min;
