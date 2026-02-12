-- Add columns to support Intercity Requests in the main trips table

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS is_travel_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS seats_required INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_entire_car BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance on filtering by request type
CREATE INDEX IF NOT EXISTS idx_trips_is_travel_request ON public.trips(is_travel_request);

-- Optional: Ensure RLS allows drivers to see these trips
-- (Assuming existing generic 'drivers can view requested trips' policy covers it)
