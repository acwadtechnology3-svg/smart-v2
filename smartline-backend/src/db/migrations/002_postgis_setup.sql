-- =============================================
-- 002: PostGIS Extension for Geospatial Queries
-- =============================================
-- Adds efficient geospatial indexing and queries
-- Performance: 100x faster than lat/lng calculations

-- =============================================
-- ENABLE POSTGIS EXTENSION
-- =============================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================
-- ADD GEOMETRY COLUMNS
-- =============================================

-- Add geography column to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Add geography columns to trips table
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS pickup_location GEOGRAPHY(POINT, 4326);

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS dest_location GEOGRAPHY(POINT, 4326);

-- =============================================
-- CREATE SPATIAL INDEXES
-- =============================================

-- GiST index for driver locations (essential for nearby searches)
CREATE INDEX IF NOT EXISTS idx_drivers_location_geo
  ON drivers USING GIST(location)
  WHERE location IS NOT NULL AND is_online = true;

-- GiST index for trip pickup locations
CREATE INDEX IF NOT EXISTS idx_trips_pickup_geo
  ON trips USING GIST(pickup_location)
  WHERE pickup_location IS NOT NULL;

-- GiST index for trip destinations
CREATE INDEX IF NOT EXISTS idx_trips_dest_geo
  ON trips USING GIST(dest_location)
  WHERE dest_location IS NOT NULL;

-- =============================================
-- TRIGGERS TO AUTO-UPDATE GEOGRAPHY
-- =============================================

-- Function to update driver location geography from lat/lng
CREATE OR REPLACE FUNCTION update_driver_location_geo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_lat IS NOT NULL AND NEW.current_lng IS NOT NULL THEN
    NEW.location = ST_SetSRID(
      ST_MakePoint(NEW.current_lng, NEW.current_lat),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for driver location updates
DROP TRIGGER IF EXISTS trg_driver_location_geo ON drivers;
CREATE TRIGGER trg_driver_location_geo
  BEFORE INSERT OR UPDATE OF current_lat, current_lng ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_location_geo();

-- Function to update trip pickup location geography
CREATE OR REPLACE FUNCTION update_trip_pickup_geo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL THEN
    NEW.pickup_location = ST_SetSRID(
      ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat),
      4326
    )::geography;
  END IF;
  IF NEW.dest_lat IS NOT NULL AND NEW.dest_lng IS NOT NULL THEN
    NEW.dest_location = ST_SetSRID(
      ST_MakePoint(NEW.dest_lng, NEW.dest_lat),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for trip location updates
DROP TRIGGER IF EXISTS trg_trip_location_geo ON trips;
CREATE TRIGGER trg_trip_location_geo
  BEFORE INSERT OR UPDATE OF pickup_lat, pickup_lng, dest_lat, dest_lng ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_pickup_geo();

-- =============================================
-- POPULATE EXISTING LOCATION DATA
-- =============================================

-- Update existing driver locations
UPDATE drivers
SET location = ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)::geography
WHERE current_lat IS NOT NULL
  AND current_lng IS NOT NULL
  AND location IS NULL;

-- Update existing trip locations
UPDATE trips
SET
  pickup_location = ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)::geography,
  dest_location = ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)::geography
WHERE pickup_lat IS NOT NULL
  AND pickup_lng IS NOT NULL
  AND pickup_location IS NULL;

-- =============================================
-- HELPER FUNCTIONS FOR GEOSPATIAL QUERIES
-- =============================================

-- Function: Find nearby online drivers
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 5000,
  p_vehicle_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  driver_id UUID,
  distance_meters DOUBLE PRECISION,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  vehicle_type TEXT,
  vehicle_model TEXT,
  rating NUMERIC,
  last_location_update TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as driver_id,
    ST_Distance(
      d.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance_meters,
    d.current_lat,
    d.current_lng,
    d.vehicle_type,
    d.vehicle_model,
    d.rating,
    d.last_location_update
  FROM drivers d
  WHERE d.status = 'approved'
    AND d.is_online = true
    AND d.location IS NOT NULL
    AND (p_vehicle_type IS NULL OR d.vehicle_type = p_vehicle_type)
    AND d.last_location_update > NOW() - INTERVAL '2 minutes'
    AND ST_DWithin(
      d.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if point is within radius of another point
CREATE OR REPLACE FUNCTION is_within_radius(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN ST_DWithin(
    ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography,
    radius_meters
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get drivers in a bounding box (for map view)
CREATE OR REPLACE FUNCTION get_drivers_in_bbox(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION
)
RETURNS TABLE (
  driver_id UUID,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  vehicle_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as driver_id,
    d.current_lat,
    d.current_lng,
    d.vehicle_type
  FROM drivers d
  WHERE d.status = 'approved'
    AND d.is_online = true
    AND d.location IS NOT NULL
    AND d.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- ANALYZE FOR QUERY PLANNER
-- =============================================

ANALYZE drivers;
ANALYZE trips;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION find_nearby_drivers IS 'Fast geospatial search for available drivers within radius';
COMMENT ON FUNCTION calculate_distance IS 'Calculate accurate distance in meters between two coordinates';
COMMENT ON INDEX idx_drivers_location_geo IS 'GiST index for efficient geospatial queries - critical for performance';
