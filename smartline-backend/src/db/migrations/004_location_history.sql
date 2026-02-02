-- =============================================
-- 004: Location History Table (Partitioned)
-- =============================================
-- Stores historical location data for trip reconstruction and analytics
-- Partitioned by month for efficient querying and data retention

-- =============================================
-- CREATE LOCATION HISTORY TABLE (PARTITIONED)
-- =============================================

CREATE TABLE IF NOT EXISTS driver_location_history (
  id BIGSERIAL,
  driver_id UUID NOT NULL,
  trip_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading SMALLINT,
  speed SMALLINT,
  accuracy SMALLINT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, recorded_at),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
) PARTITION BY RANGE (recorded_at);

-- =============================================
-- CREATE INITIAL PARTITIONS (Current and Next 3 Months)
-- =============================================

-- Note: These are example partitions. In production, use the
-- maintain_partitions function from migration 003 to automate this.

-- Current month (adjust dates based on deployment time)
CREATE TABLE IF NOT EXISTS driver_location_history_2024_01
  PARTITION OF driver_location_history
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS driver_location_history_2024_02
  PARTITION OF driver_location_history
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE IF NOT EXISTS driver_location_history_2024_03
  PARTITION OF driver_location_history
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE IF NOT EXISTS driver_location_history_2024_04
  PARTITION OF driver_location_history
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

-- =============================================
-- CREATE INDEXES ON PARTITION KEY
-- =============================================

-- Index for querying by driver and time (trip reconstruction)
CREATE INDEX IF NOT EXISTS idx_location_history_driver_time
  ON driver_location_history(driver_id, recorded_at DESC);

-- Index for querying by trip
CREATE INDEX IF NOT EXISTS idx_location_history_trip
  ON driver_location_history(trip_id)
  WHERE trip_id IS NOT NULL;

-- Spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_location_history_geo
  ON driver_location_history USING GIST(
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  );

-- =============================================
-- DATA RETENTION POLICY
-- =============================================

-- Function to cleanup old location history (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_location_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete records older than 90 days
  DELETE FROM driver_location_history
  WHERE recorded_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old location records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get driver's route for a specific trip
CREATE OR REPLACE FUNCTION get_trip_route(p_trip_id UUID)
RETURNS TABLE (
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  heading SMALLINT,
  speed SMALLINT,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.lat,
    h.lng,
    h.heading,
    h.speed,
    h.recorded_at
  FROM driver_location_history h
  WHERE h.trip_id = p_trip_id
  ORDER BY h.recorded_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get driver's location history for a time period
CREATE OR REPLACE FUNCTION get_driver_history(
  p_driver_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS TABLE (
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  trip_id UUID,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.lat,
    h.lng,
    h.trip_id,
    h.recorded_at
  FROM driver_location_history h
  WHERE h.driver_id = p_driver_id
    AND h.recorded_at BETWEEN p_start_time AND p_end_time
  ORDER BY h.recorded_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate actual trip distance from recorded points
CREATE OR REPLACE FUNCTION calculate_trip_distance_from_history(p_trip_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_distance NUMERIC := 0;
  prev_location GEOGRAPHY;
  curr_location GEOGRAPHY;
  location_record RECORD;
BEGIN
  FOR location_record IN
    SELECT lat, lng FROM driver_location_history
    WHERE trip_id = p_trip_id
    ORDER BY recorded_at ASC
  LOOP
    curr_location := ST_SetSRID(ST_MakePoint(location_record.lng, location_record.lat), 4326)::geography;

    IF prev_location IS NOT NULL THEN
      total_distance := total_distance + ST_Distance(prev_location, curr_location);
    END IF;

    prev_location := curr_location;
  END LOOP;

  RETURN total_distance; -- Returns distance in meters
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- MATERIALIZED VIEW FOR ANALYTICS (OPTIONAL)
-- =============================================

-- Create materialized view for daily driver activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS driver_daily_activity AS
SELECT
  driver_id,
  DATE(recorded_at) as activity_date,
  COUNT(*) as location_updates,
  COUNT(DISTINCT trip_id) FILTER (WHERE trip_id IS NOT NULL) as trips_count,
  MIN(recorded_at) as first_update,
  MAX(recorded_at) as last_update
FROM driver_location_history
GROUP BY driver_id, DATE(recorded_at);

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_driver_daily_activity_driver_date
  ON driver_daily_activity(driver_id, activity_date DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_driver_activity()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY driver_daily_activity;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEDULED MAINTENANCE (Using pg_cron if available)
-- =============================================

-- If pg_cron extension is available, schedule automatic cleanup:
-- SELECT cron.schedule('cleanup_location_history', '0 2 * * *',
--   $$SELECT cleanup_old_location_history()$$
-- );

-- And refresh materialized view daily:
-- SELECT cron.schedule('refresh_driver_activity', '0 3 * * *',
--   $$SELECT refresh_driver_activity()$$
-- );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE driver_location_history IS 'Historical location data for trip reconstruction and analytics. Partitioned by month, 90-day retention.';
COMMENT ON FUNCTION get_trip_route IS 'Retrieves the complete route for a specific trip';
COMMENT ON FUNCTION get_driver_history IS 'Retrieves driver location history for a time period';
COMMENT ON FUNCTION calculate_trip_distance_from_history IS 'Calculates actual trip distance from recorded GPS points';
COMMENT ON FUNCTION cleanup_old_location_history IS 'Deletes location records older than 90 days';

-- =============================================
-- USAGE INSTRUCTIONS
-- =============================================

-- To get a trip's route:
-- SELECT * FROM get_trip_route('trip-uuid-here');

-- To get driver's history for a day:
-- SELECT * FROM get_driver_history(
--   'driver-uuid-here',
--   '2024-01-01 00:00:00',
--   '2024-01-01 23:59:59'
-- );

-- To calculate actual trip distance:
-- SELECT calculate_trip_distance_from_history('trip-uuid-here');

-- To cleanup old data manually:
-- SELECT cleanup_old_location_history();

-- To refresh activity view:
-- SELECT refresh_driver_activity();
