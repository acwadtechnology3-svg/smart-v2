-- Add promo columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS promo_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trips_promo_id ON public.trips(promo_id);
