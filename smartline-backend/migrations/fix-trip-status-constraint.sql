-- Fix trip status constraint to include 'arrived'
-- Run this in your Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled'));
