-- Add service_tier column to drivers table
ALTER TABLE drivers ADD COLUMN service_tier text CHECK (service_tier IN ('saver', 'comfort', 'vip', 'scooter', 'taxi'));

-- Optional: Set default based on vehicle_type for existing records (if any)
UPDATE drivers SET service_tier = 'saver' WHERE vehicle_type = 'car';
UPDATE drivers SET service_tier = 'scooter' WHERE vehicle_type = 'motorcycle';
UPDATE drivers SET service_tier = 'taxi' WHERE vehicle_type = 'taxi';
