-- =============================================
-- 003: Table Partitioning for Large Datasets
-- =============================================
-- Implement when data volume exceeds:
-- - Trips: > 1M records
-- - Wallet Transactions: > 5M records
-- - Location History: > 10M records

-- NOTE: This migration is OPTIONAL and should only be applied
-- when the application reaches significant scale.
-- Partitioning adds complexity and should be done during low-traffic period.

-- =============================================
-- WALLET_TRANSACTIONS PARTITIONING
-- =============================================

-- Step 1: Rename existing table (backup)
-- ALTER TABLE wallet_transactions RENAME TO wallet_transactions_old;

-- Step 2: Create partitioned table
-- CREATE TABLE wallet_transactions (
--   id UUID DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL,
--   amount NUMERIC NOT NULL,
--   type TEXT NOT NULL,
--   trip_id UUID,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   PRIMARY KEY (id, created_at),
--   FOREIGN KEY (user_id) REFERENCES users(id),
--   FOREIGN KEY (trip_id) REFERENCES trips(id)
-- ) PARTITION BY RANGE (created_at);

-- Step 3: Create monthly partitions for current and next 3 months
-- Example for 2024:
-- CREATE TABLE wallet_transactions_2024_01
--   PARTITION OF wallet_transactions
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- CREATE TABLE wallet_transactions_2024_02
--   PARTITION OF wallet_transactions
--   FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- CREATE TABLE wallet_transactions_2024_03
--   PARTITION OF wallet_transactions
--   FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Step 4: Copy data from old table
-- INSERT INTO wallet_transactions SELECT * FROM wallet_transactions_old;

-- Step 5: Verify data integrity and drop old table
-- DROP TABLE wallet_transactions_old;

-- =============================================
-- AUTOMATED PARTITION CREATION FUNCTION
-- =============================================

-- Function to automatically create next month's partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
  table_name TEXT,
  start_date DATE
)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  start_month TEXT;
  end_date DATE;
BEGIN
  -- Generate partition name (e.g., wallet_transactions_2024_01)
  start_month := to_char(start_date, 'YYYY_MM');
  partition_name := table_name || '_' || start_month;

  -- Calculate end date (first day of next month)
  end_date := start_date + INTERVAL '1 month';

  -- Create partition if it doesn't exist
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    table_name,
    start_date,
    end_date
  );

  RAISE NOTICE 'Created partition % for range % to %', partition_name, start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PARTITION MAINTENANCE FUNCTION
-- =============================================

-- Function to create partitions for next N months
CREATE OR REPLACE FUNCTION maintain_partitions(
  table_name TEXT,
  months_ahead INTEGER DEFAULT 3
)
RETURNS VOID AS $$
DECLARE
  current_month DATE;
  i INTEGER;
BEGIN
  current_month := date_trunc('month', CURRENT_DATE);

  FOR i IN 0..months_ahead LOOP
    PERFORM create_monthly_partition(
      table_name,
      current_month + (i || ' months')::INTERVAL
    );
  END LOOP;

  RAISE NOTICE 'Partitions maintained for % months ahead', months_ahead;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PARTITION CLEANUP FUNCTION
-- =============================================

-- Function to drop old partitions (for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_partitions(
  table_name TEXT,
  retention_months INTEGER DEFAULT 24
)
RETURNS VOID AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE;
BEGIN
  cutoff_date := date_trunc('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);

  FOR partition_record IN
    SELECT
      child.relname as partition_name
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    WHERE parent.relname = table_name
  LOOP
    -- Extract date from partition name and drop if old
    -- This is simplified - production should parse partition date properly
    RAISE NOTICE 'Would drop old partition: %', partition_record.partition_name;
    -- EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEDULE PARTITION MAINTENANCE (Optional)
-- =============================================

-- If using pg_cron extension:
-- SELECT cron.schedule('maintain_partitions', '0 0 1 * *',
--   $$SELECT maintain_partitions('wallet_transactions', 3)$$
-- );

-- =============================================
-- TRIPS TABLE PARTITIONING (Future)
-- =============================================

-- Similar approach for trips table when volume exceeds 1M
-- Partition by created_at monthly

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION create_monthly_partition IS 'Creates a new monthly partition for the specified table';
COMMENT ON FUNCTION maintain_partitions IS 'Ensures partitions exist for next N months';
COMMENT ON FUNCTION cleanup_old_partitions IS 'Drops partitions older than retention period';

-- =============================================
-- USAGE INSTRUCTIONS
-- =============================================

-- To manually create partitions for next 6 months:
-- SELECT maintain_partitions('wallet_transactions', 6);

-- To check existing partitions:
-- SELECT
--   child.relname as partition_name,
--   pg_get_expr(child.relpartbound, child.oid) as partition_range
-- FROM pg_inherits
-- JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
-- JOIN pg_class child ON pg_inherits.inhrelid = child.oid
-- WHERE parent.relname = 'wallet_transactions';
