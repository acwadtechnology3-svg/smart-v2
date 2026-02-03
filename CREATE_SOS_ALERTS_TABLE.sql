-- Drop table if exists to start fresh
DROP TABLE IF EXISTS public.sos_alerts CASCADE;

-- SOS Alerts Table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'false_alarm', 'cancelled')),
    resolved_by UUID, -- references dashboard_users(id), leaving loose to avoid strict deps
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sos_alerts_driver_id ON public.sos_alerts(driver_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all access for anon sos" ON public.sos_alerts
FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Check if already added to avoid error
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'sos_alerts'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
        END IF;
    ELSE
        CREATE PUBLICATION supabase_realtime FOR TABLE public.sos_alerts;
    END IF;
END $$;

-- Update trigger
CREATE OR REPLACE FUNCTION public.update_sos_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sos_alerts_updated_at ON public.sos_alerts;
CREATE TRIGGER tr_sos_alerts_updated_at
    BEFORE UPDATE ON public.sos_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sos_alerts_updated_at();
