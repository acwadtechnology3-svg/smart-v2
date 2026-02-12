-- Migration: 07_travel_request.sql
-- Description: Add support for Travel Requests (Scheduled Intercity Trips)

-- 1. Add Travel Captain capability to Drivers table
ALTER TABLE drivers 
ADD COLUMN is_travel_captain BOOLEAN DEFAULT FALSE,
ADD COLUMN travel_captain_status VARCHAR(20) DEFAULT 'none' CHECK (travel_captain_status IN ('none', 'pending', 'approved', 'rejected'));

-- 2. Add Travel Request fields to Trips table
ALTER TABLE trips
ADD COLUMN is_travel_request BOOLEAN DEFAULT FALSE,
ADD COLUMN scheduled_at TIMESTAMPTZ,
ADD COLUMN seats_required INTEGER DEFAULT 4, -- 1, 2, 3 or 4 (all car)
ADD COLUMN is_entire_car BOOLEAN DEFAULT FALSE; -- True if "all the car" requested

-- 3. Create index for efficient querying of travel requests
CREATE INDEX idx_trips_is_travel_request ON trips(is_travel_request);
CREATE INDEX idx_drivers_is_travel_captain ON drivers(is_travel_captain) WHERE is_travel_captain = TRUE;
