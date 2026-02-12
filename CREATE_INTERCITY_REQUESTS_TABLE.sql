CREATE TABLE IF NOT EXISTS public.intercity_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat FLOAT8 NOT NULL,
  pickup_lng FLOAT8 NOT NULL,
  destination_location TEXT NOT NULL,
  destination_lat FLOAT8 NOT NULL,
  destination_lng FLOAT8 NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  seats_requested INT NOT NULL DEFAULT 1,
  is_entire_car BOOLEAN DEFAULT FALSE,
  offer_price NUMERIC(10, 2),
  status TEXT CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.intercity_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'intercity_requests' AND policyname = 'Users can insert their own requests'
    ) THEN
        CREATE POLICY "Users can insert their own requests" ON public.intercity_requests
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'intercity_requests' AND policyname = 'Users can view their own requests'
    ) THEN
        CREATE POLICY "Users can view their own requests" ON public.intercity_requests
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;
