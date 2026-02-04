-- Migration: Add destination preference mode for drivers
-- Created: 2025-02-04

-- Driver destination preferences settings
CREATE TABLE IF NOT EXISTS driver_destination_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    max_deviation_meters INT DEFAULT 2000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id)
);

-- Individual preferred destinations (max 3 per driver)
CREATE TABLE IF NOT EXISTS driver_preferred_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preference_id UUID NOT NULL REFERENCES driver_destination_preferences(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    radius_meters INT DEFAULT 5000,
    priority INT DEFAULT 1 CHECK (priority >= 1 AND priority <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add column to drivers table for quick lookup
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS dest_preference_enabled BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_prefs_driver 
    ON driver_destination_preferences(driver_id);
    
CREATE INDEX IF NOT EXISTS idx_pref_destinations_pref 
    ON driver_preferred_destinations(preference_id);

-- Spatial index for destination lookups (if PostGIS is available)
-- Note: If PostGIS is not enabled, you can add lat/lng indexes instead
CREATE INDEX IF NOT EXISTS idx_destinations_location 
    ON driver_preferred_destinations(lat, lng);

-- Update function to sync dest_preference_enabled on drivers table
CREATE OR REPLACE FUNCTION sync_driver_dest_preference()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE drivers 
    SET dest_preference_enabled = NEW.enabled
    WHERE id = NEW.driver_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep drivers table in sync
DROP TRIGGER IF EXISTS trigger_sync_dest_preference ON driver_destination_preferences;
CREATE TRIGGER trigger_sync_dest_preference
    AFTER INSERT OR UPDATE OF enabled ON driver_destination_preferences
    FOR EACH ROW
    EXECUTE FUNCTION sync_driver_dest_preference();

-- RLS Policies (if enabled)
ALTER TABLE driver_destination_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_preferred_destinations ENABLE ROW LEVEL SECURITY;

-- Drivers can only see their own preferences
CREATE POLICY driver_preferences_select 
    ON driver_destination_preferences 
    FOR SELECT 
    USING (driver_id = auth.uid());

CREATE POLICY driver_preferences_insert 
    ON driver_destination_preferences 
    FOR INSERT 
    WITH CHECK (driver_id = auth.uid());

CREATE POLICY driver_preferences_update 
    ON driver_destination_preferences 
    FOR UPDATE 
    USING (driver_id = auth.uid());

CREATE POLICY driver_preferences_delete 
    ON driver_destination_preferences 
    FOR DELETE 
    USING (driver_id = auth.uid());

-- Destinations - drivers can only see their own via preference_id
CREATE POLICY driver_destinations_select 
    ON driver_preferred_destinations 
    FOR SELECT 
    USING (preference_id IN (
        SELECT id FROM driver_destination_preferences WHERE driver_id = auth.uid()
    ));

CREATE POLICY driver_destinations_insert 
    ON driver_preferred_destinations 
    FOR INSERT 
    WITH CHECK (preference_id IN (
        SELECT id FROM driver_destination_preferences WHERE driver_id = auth.uid()
    ));

CREATE POLICY driver_destinations_update 
    ON driver_preferred_destinations 
    FOR UPDATE 
    USING (preference_id IN (
        SELECT id FROM driver_destination_preferences WHERE driver_id = auth.uid()
    ));

CREATE POLICY driver_destinations_delete 
    ON driver_preferred_destinations 
    FOR DELETE 
    USING (preference_id IN (
        SELECT id FROM driver_destination_preferences WHERE driver_id = auth.uid()
    ));
