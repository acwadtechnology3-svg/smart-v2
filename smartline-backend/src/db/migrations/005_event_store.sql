-- =============================================
-- 005: Event Store for Event Sourcing
-- =============================================
-- Append-only log of all domain events
-- Enables event replay, audit trail, and debugging

-- =============================================
-- EVENT STORE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS event_store (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sequence_number BIGINT NOT NULL,
  UNIQUE (aggregate_type, aggregate_id, sequence_number)
);

-- =============================================
-- INDEXES
-- =============================================

-- Query events for specific aggregate
CREATE INDEX idx_event_store_aggregate
  ON event_store(aggregate_type, aggregate_id, sequence_number);

-- Query events by type
CREATE INDEX idx_event_store_type
  ON event_store(event_type, created_at);

-- Query recent events
CREATE INDEX idx_event_store_created
  ON event_store(created_at DESC);

-- Query events by payload (JSONB index for flexible querying)
CREATE INDEX idx_event_store_payload
  ON event_store USING GIN(payload);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get event stream for an aggregate
CREATE OR REPLACE FUNCTION get_event_stream(
  p_aggregate_type VARCHAR,
  p_aggregate_id UUID
)
RETURNS TABLE (
  event_type VARCHAR,
  payload JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  sequence_number BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.event_type,
    e.payload,
    e.metadata,
    e.created_at,
    e.sequence_number
  FROM event_store e
  WHERE e.aggregate_type = p_aggregate_type
    AND e.aggregate_id = p_aggregate_id
  ORDER BY e.sequence_number ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get events by type within time range
CREATE OR REPLACE FUNCTION get_events_by_type(
  p_event_type VARCHAR,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  aggregate_type VARCHAR,
  aggregate_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.aggregate_type,
    e.aggregate_id,
    e.payload,
    e.created_at
  FROM event_store e
  WHERE e.event_type = p_event_type
    AND e.created_at BETWEEN p_start_time AND p_end_time
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Count events by type (for analytics)
CREATE OR REPLACE FUNCTION count_events_by_type(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS TABLE (
  event_type VARCHAR,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.event_type,
    COUNT(*) as event_count
  FROM event_store e
  WHERE e.created_at BETWEEN p_start_time AND p_end_time
  GROUP BY e.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- EVENT STORE INTEGRITY CONSTRAINTS
-- =============================================

-- Ensure no gaps in sequence numbers
CREATE OR REPLACE FUNCTION check_sequence_gap()
RETURNS TRIGGER AS $$
DECLARE
  expected_seq BIGINT;
BEGIN
  -- Get the current max sequence for this aggregate
  SELECT COALESCE(MAX(sequence_number), 0) INTO expected_seq
  FROM event_store
  WHERE aggregate_type = NEW.aggregate_type
    AND aggregate_id = NEW.aggregate_id
    AND id != NEW.id;

  -- New sequence should be expected_seq + 1
  IF NEW.sequence_number != expected_seq + 1 THEN
    RAISE EXCEPTION 'Sequence gap detected for aggregate %.% Expected %, got %',
      NEW.aggregate_type, NEW.aggregate_id, expected_seq + 1, NEW.sequence_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_sequence_gap
  BEFORE INSERT ON event_store
  FOR EACH ROW
  EXECUTE FUNCTION check_sequence_gap();

-- =============================================
-- MATERIALIZED VIEW FOR ANALYTICS
-- =============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS event_summary AS
SELECT
  event_type,
  aggregate_type,
  DATE(created_at) as event_date,
  COUNT(*) as event_count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM event_store
GROUP BY event_type, aggregate_type, DATE(created_at);

CREATE INDEX idx_event_summary_date
  ON event_summary(event_date DESC);

-- Function to refresh summary
CREATE OR REPLACE FUNCTION refresh_event_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_summary;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE event_store IS 'Append-only event log for event sourcing. Never UPDATE or DELETE.';
COMMENT ON COLUMN event_store.sequence_number IS 'Monotonically increasing per aggregate, no gaps allowed';
COMMENT ON FUNCTION get_event_stream IS 'Retrieve full event stream for aggregate replay';
COMMENT ON FUNCTION get_events_by_type IS 'Query events by type within time range';

-- =============================================
-- USAGE EXAMPLES
-- =============================================

-- Get all events for a trip:
-- SELECT * FROM get_event_stream('Trip', 'trip-uuid-here');

-- Get all trip requests today:
-- SELECT * FROM get_events_by_type('TRIP_REQUESTED', '2024-01-01 00:00:00', '2024-01-01 23:59:59');

-- Count events by type for last 24 hours:
-- SELECT * FROM count_events_by_type(NOW() - INTERVAL '24 hours', NOW());

-- Refresh analytics:
-- SELECT refresh_event_summary();
