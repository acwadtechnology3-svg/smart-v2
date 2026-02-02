-- =============================================
-- 006: Outbox Pattern for Reliable Event Publishing
-- =============================================
-- Ensures events are never lost even if message queue is unavailable
-- Events are written to database first, then published asynchronously

-- =============================================
-- OUTBOX TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS outbox (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  retry_count INT DEFAULT 0,
  error_message TEXT,
  next_retry_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES
-- =============================================

-- Query pending events for processing
CREATE INDEX idx_outbox_pending
  ON outbox(status, created_at)
  WHERE status = 'pending';

-- Query events ready for retry
CREATE INDEX idx_outbox_retry
  ON outbox(next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Query by event type
CREATE INDEX idx_outbox_type
  ON outbox(event_type);

-- =============================================
-- OUTBOX PROCESSOR FUNCTIONS
-- =============================================

-- Get pending events to publish
CREATE OR REPLACE FUNCTION get_pending_outbox_events(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id BIGINT,
  event_type VARCHAR,
  payload JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.event_type,
    o.payload
  FROM outbox o
  WHERE o.status = 'pending'
  ORDER BY o.created_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED; -- Lock rows for processing, skip if locked by another worker
END;
$$ LANGUAGE plpgsql;

-- Mark event as published
CREATE OR REPLACE FUNCTION mark_outbox_published(p_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE outbox
  SET status = 'published',
      published_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Mark event as failed with retry
CREATE OR REPLACE FUNCTION mark_outbox_failed(
  p_id BIGINT,
  p_error_message TEXT,
  p_retry_delay_seconds INT DEFAULT 60
)
RETURNS VOID AS $$
BEGIN
  UPDATE outbox
  SET status = 'failed',
      retry_count = retry_count + 1,
      error_message = p_error_message,
      next_retry_at = NOW() + (p_retry_delay_seconds || ' seconds')::INTERVAL
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Get events ready for retry
CREATE OR REPLACE FUNCTION get_retry_outbox_events(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id BIGINT,
  event_type VARCHAR,
  payload JSONB,
  retry_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.event_type,
    o.payload,
    o.retry_count
  FROM outbox o
  WHERE o.status = 'failed'
    AND o.next_retry_at <= NOW()
    AND o.retry_count < 5 -- Max 5 retries
  ORDER BY o.next_retry_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old published events
CREATE OR REPLACE FUNCTION cleanup_published_outbox(
  p_retention_days INT DEFAULT 7
)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM outbox
  WHERE status = 'published'
    AND published_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % published outbox events', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Move permanently failed events to dead letter
CREATE OR REPLACE FUNCTION archive_failed_outbox()
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  -- Events that failed after max retries (5)
  INSERT INTO outbox_dead_letter (event_type, payload, original_created_at, retry_count, error_message)
  SELECT event_type, payload, created_at, retry_count, error_message
  FROM outbox
  WHERE status = 'failed'
    AND retry_count >= 5;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Delete from outbox
  DELETE FROM outbox
  WHERE status = 'failed'
    AND retry_count >= 5;

  RAISE NOTICE 'Archived % failed outbox events', archived_count;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DEAD LETTER TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS outbox_dead_letter (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  original_created_at TIMESTAMPTZ NOT NULL,
  retry_count INT NOT NULL,
  error_message TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outbox_dead_letter_type
  ON outbox_dead_letter(event_type);

CREATE INDEX idx_outbox_dead_letter_archived
  ON outbox_dead_letter(archived_at DESC);

-- =============================================
-- OUTBOX STATISTICS
-- =============================================

CREATE OR REPLACE FUNCTION get_outbox_stats()
RETURNS TABLE (
  status VARCHAR,
  event_count BIGINT,
  oldest_event TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.status,
    COUNT(*) as event_count,
    MIN(o.created_at) as oldest_event
  FROM outbox o
  GROUP BY o.status;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE outbox IS 'Outbox pattern for reliable event publishing. Events written here are guaranteed to be published.';
COMMENT ON TABLE outbox_dead_letter IS 'Events that failed after max retries. Requires manual investigation.';
COMMENT ON FUNCTION get_pending_outbox_events IS 'Get pending events with row-level locking for concurrent workers';
COMMENT ON FUNCTION cleanup_published_outbox IS 'Delete successfully published events older than retention period';

-- =============================================
-- SCHEDULED JOBS (if pg_cron available)
-- =============================================

-- Cleanup published events daily
-- SELECT cron.schedule('cleanup_outbox', '0 3 * * *',
--   $$SELECT cleanup_published_outbox(7)$$
-- );

-- Archive failed events daily
-- SELECT cron.schedule('archive_outbox', '0 4 * * *',
--   $$SELECT archive_failed_outbox()$$
-- );

-- =============================================
-- USAGE EXAMPLES
-- =============================================

-- Insert event into outbox (within transaction):
-- INSERT INTO outbox (event_type, payload) VALUES ('TRIP_COMPLETED', '{"tripId": "..."}');

-- Process pending events:
-- SELECT * FROM get_pending_outbox_events(100);

-- Mark as published:
-- SELECT mark_outbox_published(event_id);

-- Mark as failed:
-- SELECT mark_outbox_failed(event_id, 'Queue unavailable', 60);

-- Get retry events:
-- SELECT * FROM get_retry_outbox_events(50);

-- Get statistics:
-- SELECT * FROM get_outbox_stats();

-- Manual cleanup:
-- SELECT cleanup_published_outbox(7);
-- SELECT archive_failed_outbox();
