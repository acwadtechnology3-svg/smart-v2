-- Add vehicle license photo columns to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS vehicle_license_front_url text,
ADD COLUMN IF NOT EXISTS vehicle_license_back_url text;

-- Add comment
COMMENT ON COLUMN drivers.vehicle_license_front_url IS 'URL to vehicle license front photo';
COMMENT ON COLUMN drivers.vehicle_license_back_url IS 'URL to vehicle license back photo';
