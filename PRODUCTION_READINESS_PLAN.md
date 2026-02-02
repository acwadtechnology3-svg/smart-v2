# SmartLine Backend: Production Readiness Plan

## Executive Summary

This document outlines a comprehensive plan to transform the SmartLine backend from its current MVP state to a production-ready, scalable ride-hailing platform capable of handling millions of users with real-time requirements.

**Current State:** Early-stage MVP with basic CRUD operations, no caching, no message queues, synchronous operations, and significant security gaps.

**Target State:** Horizontally scalable, fault-tolerant, real-time platform with sub-second matching, financial integrity guarantees, and comprehensive observability.

---

## Table of Contents

1. [Critical Security Fixes (P0)](#phase-1-critical-security-fixes-p0)
2. [Database Optimization & Scaling](#phase-2-database-optimization--scaling)
3. [Real-Time Location & Tracking System](#phase-3-real-time-location--tracking-system)
4. [Matching & Dispatch Engine](#phase-4-matching--dispatch-engine)
5. [Messaging & Event-Driven Architecture](#phase-5-messaging--event-driven-architecture)
6. [Pricing, Surge & ETA Engine](#phase-6-pricing-surge--eta-engine)
7. [Payments & Financial Integrity](#phase-7-payments--financial-integrity)
8. [Infrastructure & DevOps](#phase-8-infrastructure--devops)
9. [Monitoring & Observability](#phase-9-monitoring--observability)
10. [Testing & Quality Assurance](#phase-10-testing--quality-assurance)
11. [API Gateway & Rate Limiting](#phase-11-api-gateway--rate-limiting)
12. [Disaster Recovery & High Availability](#phase-12-disaster-recovery--high-availability)

---

## Phase 1: Critical Security Fixes (P0)

### What Will Break First
- **Credentials in source code** will be leaked if repo is compromised
- **Permissive RLS policies** allow any user to access/modify any data
- **No auth middleware** means protected endpoints are accessible to anyone
- **No input validation** opens SQL injection and XSS vulnerabilities

### Priority Fixes

#### 1.1 Environment & Secrets Management
```
Files to modify:
- src/config/env.ts (new)
- src/controllers/paymentController.ts
- .env.example (new)
- .gitignore
```

#### 1.2 Authentication Middleware
```
Files to create/modify:
- src/middleware/auth.ts (new)
- src/middleware/rbac.ts (new)
- src/routes/*.ts (all routes)
```

#### 1.3 Row Level Security (RLS) Policies
```
Files to modify:
- src/db/schema.sql
- src/db/rls-policies.sql (new)
```

#### 1.4 Input Validation & Sanitization
```
Files to create/modify:
- src/middleware/validation.ts (new)
- src/validators/*.ts (new directory)
```

### Implementation Prompt for Phase 1

```
PROMPT: Security Hardening for SmartLine Backend

Context: You are working on a ride-hailing backend (smartline-backend) that needs critical security fixes before production. The current state has hardcoded credentials, no auth middleware, permissive database policies, and no input validation.

Current Tech Stack:
- Express.js with TypeScript
- Supabase (PostgreSQL)
- JWT for authentication
- Kashier payment gateway

Tasks to Complete:

1. SECRETS MANAGEMENT
Create src/config/env.ts that:
- Uses dotenv to load environment variables
- Validates all required env vars exist at startup (fail fast)
- Exports typed configuration object
- Never exposes secrets in error messages
- Add .env.example with placeholder values
- Remove ALL hardcoded credentials from paymentController.ts (Kashier keys)

Required env vars:
- DATABASE_URL, SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY
- JWT_SECRET (minimum 32 chars)
- KASHIER_MERCHANT_ID, KASHIER_API_KEY, KASHIER_WEBHOOK_SECRET
- NODE_ENV, PORT

2. AUTHENTICATION MIDDLEWARE
Create src/middleware/auth.ts that:
- Extracts JWT from Authorization header (Bearer token)
- Verifies token signature and expiration
- Attaches decoded user to req.user
- Returns 401 for invalid/expired tokens
- Handles token refresh logic

Create src/middleware/rbac.ts that:
- Exports role checking middleware: requireRole('driver'), requireRole('customer'), requireRole('admin')
- Returns 403 for unauthorized roles
- Supports array of allowed roles: requireRole(['driver', 'admin'])

Apply middleware to all routes:
- Public routes: /auth/check-phone, /auth/signup, /auth/login, /payment/callback
- Customer routes: /trips/create, /trips/:tripId (GET own trips only)
- Driver routes: /trips/update-status (own trips), /payment/withdraw/*
- Admin routes: /payment/withdraw/manage

3. ROW LEVEL SECURITY POLICIES
Create src/db/rls-policies.sql with proper policies:

For users table:
- SELECT: Users can only read their own record
- UPDATE: Users can only update their own record (except role, balance)
- INSERT: Only via authenticated signup

For drivers table:
- SELECT: Anyone can see online drivers (limited fields), drivers see own full record
- UPDATE: Drivers can only update own location and availability
- INSERT: Only via driver registration flow

For trips table:
- SELECT: Customers see own trips, drivers see trips they're assigned to or available trips
- UPDATE: Customers can update own pending trips, drivers can update status of assigned trips
- INSERT: Only customers can create trips

For trip_offers table:
- SELECT: Customers see offers for their trips, drivers see own offers
- INSERT: Only online approved drivers
- UPDATE: Only trip owner can accept/reject

For wallet_transactions table:
- SELECT: Users see only own transactions
- INSERT: Only via backend service role

For withdrawal_requests table:
- SELECT: Drivers see own requests
- INSERT: Only drivers
- UPDATE: Only admins

4. INPUT VALIDATION
Install: npm install zod

Create src/validators/schemas.ts with Zod schemas for:
- Phone number (Egyptian format: +20XXXXXXXXXX)
- Password (min 8 chars, requires number and letter)
- Coordinates (lat: -90 to 90, lng: -180 to 180)
- Price (positive number, max 10000)
- Trip status (enum validation)
- UUID format validation

Create src/middleware/validate.ts that:
- Takes a Zod schema and validates req.body
- Returns 400 with specific field errors
- Sanitizes string inputs (trim, escape HTML)

Apply validation to all endpoints:
- /auth/signup: phone, password, role, name
- /trips/create: all coordinates, price, car_type, payment_method
- /trips/update-status: tripId (UUID), status (enum)
- /payment/deposit/init: userId (UUID), amount (positive number)
- /payment/withdraw/request: amount, method, accountNumber

5. ADDITIONAL SECURITY
- Add helmet middleware for security headers
- Configure CORS properly (not open to all origins)
- Add request ID middleware for tracing
- Implement rate limiting on auth endpoints (10 req/min per IP)
- Add SQL injection protection (parameterized queries - verify Supabase client usage)
- Remove sensitive data from error responses in production

6. SECURITY HEADERS
Add to src/index.ts:
- helmet() with CSP, HSTS, X-Frame-Options
- CORS with specific allowed origins from env
- Disable X-Powered-By header

Testing Requirements:
- All protected routes return 401 without valid token
- All protected routes return 403 with wrong role
- Invalid input returns 400 with specific field errors
- Credentials are loaded from env vars only
- RLS policies block unauthorized access at database level

DO NOT:
- Skip any validation
- Use string concatenation for SQL
- Log sensitive data (passwords, tokens, full card numbers)
- Return stack traces in production errors
```

---

## Phase 2: Database Optimization & Scaling

### What Will Break First
- **No indexes** causes full table scans as data grows
- **Geospatial queries without PostGIS** are inefficient
- **No connection pooling** leads to connection exhaustion
- **Single region** creates latency for distant users
- **No read replicas** means writes block reads

### At What Scale It Breaks
- 10K+ trips: Queries slow down noticeably (>500ms)
- 100K+ drivers: Location queries timeout
- 1M+ transactions: Financial reports crash

### Priority Fixes

#### 2.1 Database Indexes
```
Files to create/modify:
- src/db/migrations/001_add_indexes.sql (new)
- src/db/migrations/002_add_postgis.sql (new)
```

#### 2.2 Connection Pooling
```
Files to modify:
- src/config/supabase.ts
- src/config/database.ts (new for direct PG access)
```

#### 2.3 Query Optimization
```
Files to modify:
- src/controllers/tripController.ts
- src/repositories/*.ts (new pattern)
```

### Implementation Prompt for Phase 2

```
PROMPT: Database Optimization & Scaling for SmartLine Backend

Context: You are optimizing the database layer of a ride-hailing backend. Current issues include no indexes, inefficient geospatial queries, no connection pooling, and direct controller-to-database coupling.

Current Schema Tables: users, drivers, trips, trip_offers, wallet_transactions, wallets, withdrawal_requests, pricing_settings

Database: Supabase (PostgreSQL 15)

Tasks to Complete:

1. DATABASE MIGRATIONS SYSTEM
Create src/db/migrations/ directory structure:
- migrations/001_initial_indexes.sql
- migrations/002_postgis_setup.sql
- migrations/003_partitioning.sql
- migrate.ts script to run migrations in order

2. CRITICAL INDEXES (001_initial_indexes.sql)

-- Users table
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- Drivers table (most critical for real-time queries)
CREATE INDEX idx_drivers_status_online ON drivers(status, is_online) WHERE status = 'approved' AND is_online = true;
CREATE INDEX idx_drivers_location ON drivers(current_lat, current_lng) WHERE is_online = true;
CREATE INDEX idx_drivers_last_update ON drivers(last_location_update DESC);

-- Trips table
CREATE INDEX idx_trips_customer ON trips(customer_id, created_at DESC);
CREATE INDEX idx_trips_driver ON trips(driver_id, created_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_trips_status ON trips(status) WHERE status IN ('requested', 'accepted', 'started');
CREATE INDEX idx_trips_active ON trips(status, created_at DESC) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_trips_pickup_location ON trips(pickup_lat, pickup_lng);

-- Trip offers table
CREATE INDEX idx_offers_trip ON trip_offers(trip_id, status);
CREATE INDEX idx_offers_driver ON trip_offers(driver_id, created_at DESC);
CREATE INDEX idx_offers_pending ON trip_offers(trip_id) WHERE status = 'pending';

-- Wallet transactions (for financial reporting)
CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_trip ON wallet_transactions(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type, created_at DESC);

-- Withdrawal requests
CREATE INDEX idx_withdrawal_driver ON withdrawal_requests(driver_id, created_at DESC);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status) WHERE status = 'pending';

3. POSTGIS EXTENSION (002_postgis_setup.sql)

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Create spatial index
CREATE INDEX idx_drivers_location_geo ON drivers USING GIST(location);

-- Create trigger to auto-update geometry from lat/lng
CREATE OR REPLACE FUNCTION update_driver_location_geo()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.current_lng, NEW.current_lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_driver_location_geo
  BEFORE INSERT OR UPDATE OF current_lat, current_lng ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_driver_location_geo();

-- Function to find nearby drivers
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 5000,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  driver_id UUID,
  distance_meters DOUBLE PRECISION,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  vehicle_type TEXT,
  rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as driver_id,
    ST_Distance(d.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_meters,
    d.current_lat,
    d.current_lng,
    d.vehicle_type,
    d.rating
  FROM drivers d
  WHERE d.status = 'approved'
    AND d.is_online = true
    AND d.location IS NOT NULL
    AND ST_DWithin(
      d.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

4. TABLE PARTITIONING (003_partitioning.sql)

-- Partition trips by month for historical data
-- (Only implement when trips > 1M)

-- Partition wallet_transactions by month
CREATE TABLE wallet_transactions_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  trip_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (automate this)
CREATE TABLE wallet_transactions_y2024m01
  PARTITION OF wallet_transactions_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

5. CONNECTION POOLING
Create src/config/database.ts:

- Use Supabase connection pooler (pgbouncer) for transactional queries
- Direct connection for migrations and admin tasks
- Configure pool size based on expected load:
  - Min connections: 5
  - Max connections: 20 (per instance)
  - Idle timeout: 30 seconds
  - Connection timeout: 10 seconds

Install: npm install pg

Configuration:
const poolConfig = {
  connectionString: process.env.DATABASE_URL, // Pooler URL
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

6. REPOSITORY PATTERN
Create src/repositories/ directory:
- BaseRepository.ts (abstract with common CRUD)
- UserRepository.ts
- DriverRepository.ts
- TripRepository.ts
- WalletRepository.ts

Each repository should:
- Encapsulate all database queries for that entity
- Use parameterized queries only
- Include query timeouts
- Log slow queries (>100ms)
- Return typed results

Example DriverRepository methods:
- findNearbyOnlineDrivers(lat, lng, radiusKm, limit)
- updateLocation(driverId, lat, lng)
- setOnlineStatus(driverId, isOnline)
- findById(driverId)
- findByUserId(userId)

7. QUERY OPTIMIZATION RULES

For tripController.ts:
- Replace SELECT * with specific columns
- Add LIMIT to all list queries
- Use cursor-based pagination (not OFFSET)
- Batch related queries where possible

Example optimized query:
// BAD
const { data } = await supabase.from('trips').select('*').eq('customer_id', id);

// GOOD
const { data } = await supabase
  .from('trips')
  .select('id, status, pickup_address, dest_address, price, created_at')
  .eq('customer_id', id)
  .order('created_at', { ascending: false })
  .limit(20);

8. READ REPLICA CONFIGURATION (Future)
Document strategy for read replicas:
- Route read queries to replica
- Route writes to primary
- Handle replication lag (eventual consistency)

9. DATABASE MONITORING
Add query logging:
- Log all queries taking > 100ms
- Track query count per endpoint
- Monitor connection pool utilization

Testing Requirements:
- Verify indexes are used (EXPLAIN ANALYZE)
- Benchmark find_nearby_drivers (should be <50ms for 100K drivers)
- Test connection pool under load (100 concurrent requests)
- Verify spatial queries return correct results

DO NOT:
- Use OFFSET for pagination (use cursor)
- SELECT * in production queries
- Create indexes on low-cardinality columns alone
- Forget to handle PostGIS installation errors gracefully
```

---

## Phase 3: Real-Time Location & Tracking System

### What Will Break First
- **No location update endpoint** means drivers can't update their position
- **Direct database writes** for location creates massive write load
- **No location history** means no route tracking or audit trail
- **Stale locations** shown to customers (no TTL/freshness check)

### At What Scale It Breaks
- 1K concurrent drivers updating every 3 seconds = 333 writes/second
- 10K drivers = 3,333 writes/second (database overwhelmed)

### Symptoms Users Will See
- Drivers shown in wrong locations
- "No drivers available" when drivers exist
- App freezes waiting for location updates
- Incorrect ETA calculations

### Architecture Changes Needed

```
Current: Driver App → (nothing) → Database

Target:  Driver App → Location API → Redis (hot storage) →
         → Async Worker → TimescaleDB (history) + PostgreSQL (latest only)
```

### Implementation Prompt for Phase 3

```
PROMPT: Real-Time Location & Tracking System for SmartLine Backend

Context: You are building a high-throughput location tracking system for a ride-hailing app. The system must handle 10K+ drivers updating their location every 3-5 seconds while maintaining sub-100ms query latency for nearby driver searches.

Current State: No location update endpoint exists. Driver locations are stored directly in PostgreSQL.

Target Architecture:
- Redis for hot location data (last 5 minutes)
- PostgreSQL/PostGIS for queryable current locations
- TimescaleDB or partitioned table for location history
- Batch writes to reduce database load

Tasks to Complete:

1. REDIS SETUP FOR LOCATION DATA
Install: npm install ioredis

Create src/config/redis.ts:
- Connection to Redis cluster/single instance
- Reconnection logic with exponential backoff
- Health check endpoint

Create src/services/locationCache.ts:
- Store driver locations in Redis GEO data structure
- Key pattern: "driver:locations" (single geo set)
- Commands: GEOADD, GEORADIUS, GEOPOS

Methods:
- updateDriverLocation(driverId, lat, lng, metadata)
  - GEOADD driver:locations lng lat driverId
  - HSET driver:{id}:meta timestamp, heading, speed, accuracy
  - SET driver:{id}:online true EX 30 (auto-expire if no updates)

- getNearbyDrivers(lat, lng, radiusKm, limit)
  - GEORADIUS driver:locations lng lat radius km WITHDIST WITHCOORD COUNT limit ASC
  - Filter by online status
  - Return with distance

- getDriverLocation(driverId)
  - GEOPOS driver:locations driverId
  - HGETALL driver:{id}:meta

- removeDriver(driverId)
  - ZREM driver:locations driverId
  - DEL driver:{id}:meta driver:{id}:online

2. LOCATION UPDATE ENDPOINT
Create src/routes/locationRoutes.ts
Create src/controllers/locationController.ts

POST /api/location/update
Headers: Authorization: Bearer <token>
Body: {
  lat: number,        // -90 to 90
  lng: number,        // -180 to 180
  heading: number,    // 0-360 degrees
  speed: number,      // km/h
  accuracy: number,   // meters
  timestamp: string   // ISO 8601
}
Response: { success: true, serverTime: string }

Logic:
1. Validate JWT, extract driver_id
2. Validate coordinates and metadata
3. Update Redis (instant)
4. Queue database update (async)
5. Return immediately

Rate limit: 1 request per 2 seconds per driver

POST /api/location/batch-update
Body: {
  locations: [
    { lat, lng, heading, speed, accuracy, timestamp }
  ]
}
For offline/reconnection scenarios - accept batched historical updates

GET /api/location/nearby
Query: lat, lng, radius (km), vehicleType (optional)
Response: {
  drivers: [
    { id, lat, lng, distance, vehicleType, rating, heading }
  ]
}

3. ASYNC DATABASE SYNC
Create src/workers/locationSyncWorker.ts

Use BullMQ for job queue:
Install: npm install bullmq

Job: sync-driver-location
- Batches location updates
- Writes to PostgreSQL every 5 seconds per driver (not every update)
- Updates: drivers.current_lat, current_lng, last_location_update

Job: archive-location-history
- Writes to location_history table
- Runs every 30 seconds
- Batches inserts (100+ at a time)

4. LOCATION HISTORY TABLE
Create src/db/migrations/004_location_history.sql

CREATE TABLE driver_location_history (
  id BIGSERIAL,
  driver_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading SMALLINT,
  speed SMALLINT,
  accuracy SMALLINT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions
-- Index for trip reconstruction
CREATE INDEX idx_location_history_driver_time
  ON driver_location_history(driver_id, recorded_at DESC);

-- Retention policy: Keep 90 days, archive older data
CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM driver_location_history
  WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

5. DRIVER ONLINE STATUS MANAGEMENT
Create src/services/driverPresence.ts

Logic:
- Driver is "online" if location updated within 30 seconds
- Redis key: driver:{id}:online with 30s TTL
- On each location update, refresh TTL
- Background job checks for expired drivers

Methods:
- setOnline(driverId): Sets online flag, refreshes TTL
- setOffline(driverId): Explicit offline (app closed)
- isOnline(driverId): Check current status
- getOnlineCount(): Total online drivers
- cleanupStaleDrivers(): Remove drivers with expired TTL from geo set

6. TRIP TRACKING
Create src/services/tripTracker.ts

When trip is active (status: accepted, arrived, started):
- Store trip route in Redis: trip:{id}:route (list of coordinates)
- RPUSH trip:{id}:route "lat,lng,timestamp"
- Cap at 1000 points per trip
- On trip complete: Persist to location_history with trip_id

Methods:
- startTracking(tripId, driverId)
- addRoutePoint(tripId, lat, lng, timestamp)
- getRoutePoints(tripId): Returns full route
- stopTracking(tripId): Persist and cleanup
- calculateTripDistance(tripId): Sum of point-to-point distances

7. LOCATION DATA FRESHNESS
Add freshness checks to nearby driver queries:

- Exclude drivers with last_update > 60 seconds ago
- Sort by freshness (most recent first) as secondary sort
- Return last_update timestamp to client
- Client shows "Location updated X seconds ago"

8. WEBSOCKET FOR LIVE TRACKING
Create src/websocket/locationSocket.ts

Using Socket.io:
Install: npm install socket.io

Events:
- driver:location (driver → server): Location update
- trip:driver-location (server → customer): Driver location during active trip
- nearby:update (server → customer): Nearby drivers update

Rooms:
- trip:{tripId} - Customer and driver join during active trip
- area:{geohash} - For nearby driver updates (optional optimization)

9. GEOFENCING (Future)
Document geofencing capability:
- Airport pickup zones
- Restricted areas
- Surge pricing zones
- Service area boundaries

10. MONITORING & ALERTS
Track metrics:
- Location updates per second
- Redis memory usage
- Database sync lag
- Stale driver count
- Average location accuracy

Alerts:
- Redis connection failure
- Database sync backlog > 1000
- Location update rate drop > 50%

Testing Requirements:
- Simulate 1000 drivers updating every 3 seconds
- Verify Redis handles load (< 10ms per operation)
- Verify nearby search returns correct results
- Test failover when Redis is unavailable
- Verify location history is preserved

DO NOT:
- Write every location update directly to PostgreSQL
- Query PostgreSQL for nearby drivers in real-time
- Store unlimited location history without partitioning
- Forget to handle Redis connection failures gracefully
```

---

## Phase 4: Matching & Dispatch Engine

### What Will Break First
- **Manual bidding doesn't scale** - customers wait too long for offers
- **No driver filtering** - all drivers see all trips (spam)
- **Race conditions** - multiple customers accept same driver
- **No load balancing** - popular areas overwhelm system

### At What Scale It Breaks
- 100+ concurrent trip requests: Offer system overwhelmed
- 1000+ drivers: Notification fan-out causes delays
- Peak hours: Manual matching causes 5+ minute wait times

### Symptoms Users Will See
- Long wait for driver offers
- Driver accepts but gets "already taken" error
- Same drivers shown for every trip
- Unfair distribution (some drivers get all trips)

### Implementation Prompt for Phase 4

```
PROMPT: Intelligent Matching & Dispatch Engine for SmartLine Backend

Context: You are building an automated matching system for a ride-hailing app. The current system relies on manual bidding where drivers see all trips and make offers. This needs to become an intelligent dispatch system that automatically matches riders with optimal drivers.

Current Flow:
1. Customer creates trip → 2. All drivers see trip → 3. Drivers make offers → 4. Customer picks offer

Target Flow (Hybrid):
1. Customer creates trip
2. System finds optimal nearby drivers
3. System sends targeted notifications to top 5-10 drivers
4. Drivers accept/decline (first-accept wins OR continue bidding)
5. Automatic fallback to wider search if no acceptance

Tasks to Complete:

1. MATCHING SERVICE ARCHITECTURE
Create src/services/matchingService.ts

Core matching algorithm:
- Input: Trip request (pickup location, destination, car type, customer preferences)
- Output: Ranked list of suitable drivers

Ranking factors (weighted scoring):
- Distance to pickup: 40% (closer = better)
- Driver rating: 20% (higher = better)
- Acceptance rate: 15% (higher = better)
- Trip completion rate: 10%
- Vehicle match: 10% (exact car type match)
- Historical performance with customer: 5% (if repeat)

Score calculation:
score = (
  (1 - distance/maxDistance) * 0.40 +
  (rating / 5.0) * 0.20 +
  acceptanceRate * 0.15 +
  completionRate * 0.10 +
  vehicleMatchBonus * 0.10 +
  repeatCustomerBonus * 0.05
)

2. DRIVER ELIGIBILITY FILTER
Create src/services/driverFilter.ts

Filter criteria (must pass all):
- is_online = true
- status = 'approved'
- last_location_update < 60 seconds ago
- Within service radius (default: 5km, configurable)
- Vehicle type matches OR is higher tier
- Not currently on active trip
- Not in "busy" cooldown period
- Account in good standing (no fraud flags)

Optional filters:
- Customer's preferred drivers (favorites)
- Customer's blocked drivers (exclusion list)
- Driver's preferred areas (if configured)

3. DISPATCH STRATEGIES
Create src/services/dispatchStrategy.ts

Implement multiple strategies:

A) FIRST_ACCEPT (Default)
- Send to top 5 drivers simultaneously
- First to accept wins
- Cancel pending requests to others
- Timeout: 15 seconds per round
- Expand to next 5 if no acceptance

B) BROADCAST_BID (Current behavior, improved)
- Send to top 10 drivers
- Collect bids for 30 seconds
- Present options to customer
- Customer selects preferred driver

C) SEQUENTIAL
- Send to #1 driver, wait 10 seconds
- If declined/timeout, send to #2
- Repeat up to 5 times
- Fallback to broadcast

D) SCHEDULED
- For future trips, match 15 minutes before
- Confirm with driver
- Backup driver on standby

4. RACE CONDITION PREVENTION
Create src/services/tripLock.ts

Using Redis distributed locks:
Install: npm install redlock

- Lock trip when acceptance in progress
- Lock driver when accepting trip
- Prevent double-booking

Implementation:
async function acceptTrip(tripId, driverId):
  // Acquire locks
  const tripLock = await redlock.lock(`lock:trip:${tripId}`, 5000)
  const driverLock = await redlock.lock(`lock:driver:${driverId}`, 5000)

  try:
    // Verify trip still available
    // Verify driver still eligible
    // Perform atomic assignment
    // Reject other pending offers
  finally:
    // Release locks
    await tripLock.release()
    await driverLock.release()

5. TRIP ASSIGNMENT FLOW
Create src/services/tripAssignment.ts

Atomic assignment transaction:
1. BEGIN TRANSACTION
2. UPDATE trips SET driver_id = X, status = 'accepted' WHERE id = Y AND status = 'requested'
3. Check affected rows (if 0, trip already taken)
4. UPDATE trip_offers SET status = 'rejected' WHERE trip_id = Y AND driver_id != X
5. UPDATE trip_offers SET status = 'accepted' WHERE trip_id = Y AND driver_id = X
6. UPDATE drivers SET current_trip_id = Y WHERE id = X (new column)
7. COMMIT

Rollback on any failure.

6. DRIVER NOTIFICATION TARGETING
Create src/services/driverNotification.ts

Instead of broadcasting to all drivers:
- Query eligible drivers (filtered + ranked)
- Send push notification to top N only
- Include trip details in notification
- Track notification delivery status

Notification payload:
{
  type: 'TRIP_REQUEST',
  tripId: string,
  pickupAddress: string,
  destAddress: string,
  estimatedPrice: number,
  estimatedDistance: number,
  estimatedDuration: number,
  expiresAt: timestamp (15 seconds)
}

7. DRIVER AVAILABILITY STATE MACHINE
Create src/services/driverStateMachine.ts

States:
- OFFLINE: Not accepting trips
- ONLINE_AVAILABLE: Ready for new trips
- ONLINE_BUSY: On active trip
- ONLINE_OFFERED: Has pending trip offer
- ONLINE_COOLDOWN: Brief pause after completing trip

Transitions:
- OFFLINE → ONLINE_AVAILABLE: Driver goes online
- ONLINE_AVAILABLE → ONLINE_OFFERED: Trip offer sent
- ONLINE_OFFERED → ONLINE_AVAILABLE: Offer declined/expired
- ONLINE_OFFERED → ONLINE_BUSY: Offer accepted
- ONLINE_BUSY → ONLINE_COOLDOWN: Trip completed
- ONLINE_COOLDOWN → ONLINE_AVAILABLE: After 60 seconds

Store state in Redis for fast access.

8. DEMAND PREDICTION & PREEMPTIVE MATCHING
Create src/services/demandPredictor.ts (Advanced)

- Track historical trip patterns by area/time
- Predict high-demand zones
- Suggest drivers reposition to high-demand areas
- Pre-warm matching cache during predicted peaks

9. FAIRNESS & LOAD BALANCING
Create src/services/driverFairness.ts

Ensure fair trip distribution:
- Track trips per driver per hour/day
- Penalize score for drivers with many recent trips
- Boost score for drivers waiting longer
- Implement "cooldown" after trip completion

Anti-gaming measures:
- Detect cherry-picking (only accepting high-value trips)
- Detect location spoofing
- Track acceptance rate trends

10. MATCHING METRICS & MONITORING
Track and log:
- Average time to first offer
- Average time to acceptance
- Match success rate (first round)
- Driver utilization rate
- Trips per driver distribution (fairness)
- Rejection reasons breakdown

11. FALLBACK & DEGRADED MODES
When matching system is overloaded:
- Increase timeout thresholds
- Reduce ranking sophistication
- Fall back to simple distance-based matching
- Queue excess requests with position updates

12. API ENDPOINTS

POST /api/trips/request (replaces /trips/create)
- Creates trip
- Triggers matching
- Returns tripId and status

GET /api/trips/:tripId/matching-status
- Returns: searching, offers_pending, matched, no_drivers

POST /api/trips/:tripId/driver-response
- For drivers to accept/decline
- Body: { action: 'accept' | 'decline', reason?: string }

POST /api/trips/:tripId/cancel-search
- Customer cancels before match

Testing Requirements:
- Simulate 100 concurrent trip requests
- Verify no double-booking occurs
- Verify fair distribution over 1000 trips
- Test timeout and retry logic
- Benchmark matching latency (should be <500ms)

DO NOT:
- Allow same driver to accept multiple trips simultaneously
- Send notifications to all drivers for every trip
- Use simple distance-only matching in production
- Ignore driver state when sending offers
```

---

## Phase 5: Messaging & Event-Driven Architecture

### What Will Break First
- **Synchronous operations** block the request cycle
- **No retry mechanism** for failed operations
- **Supabase Realtime limits** under high load
- **No event sourcing** makes debugging impossible

### At What Scale It Breaks
- 1K concurrent users: Realtime connections max out
- 100 trips/minute: Synchronous processing causes timeouts
- Any payment failure: Lost transactions with no recovery

### Implementation Prompt for Phase 5

```
PROMPT: Event-Driven Architecture & Message Queue System for SmartLine Backend

Context: You are implementing an event-driven architecture for a ride-hailing backend. The current system is entirely synchronous with no message queues, no event logging, and no retry mechanisms.

Goals:
- Decouple services using events
- Enable async processing of non-critical operations
- Implement reliable retry mechanisms
- Create audit trail via event sourcing
- Handle backpressure during traffic spikes

Tasks to Complete:

1. MESSAGE QUEUE SETUP (BullMQ + Redis)
Install: npm install bullmq

Create src/config/queue.ts:
- Redis connection for BullMQ
- Default job options (attempts, backoff, timeout)
- Queue naming conventions

Create src/queues/index.ts:
Define queues:
- location-sync: Driver location database updates
- notifications: Push notifications, SMS, Email
- trip-events: Trip lifecycle events
- payment-processing: Payment callbacks, reconciliation
- analytics: Event tracking, metrics
- cleanup: Expired data cleanup

2. EVENT DEFINITIONS
Create src/events/types.ts:

Domain events:
- TRIP_REQUESTED: { tripId, customerId, pickup, destination, timestamp }
- TRIP_MATCHED: { tripId, driverId, estimatedArrival, timestamp }
- TRIP_DRIVER_ARRIVED: { tripId, driverId, arrivedAt }
- TRIP_STARTED: { tripId, startedAt, startLocation }
- TRIP_COMPLETED: { tripId, completedAt, finalPrice, distance, duration }
- TRIP_CANCELLED: { tripId, cancelledBy, reason, timestamp }

- DRIVER_ONLINE: { driverId, location, timestamp }
- DRIVER_OFFLINE: { driverId, timestamp }
- DRIVER_LOCATION_UPDATED: { driverId, location, timestamp }

- PAYMENT_INITIATED: { paymentId, userId, amount, method }
- PAYMENT_COMPLETED: { paymentId, transactionId, timestamp }
- PAYMENT_FAILED: { paymentId, error, timestamp }

- WALLET_CREDITED: { userId, amount, source, transactionId }
- WALLET_DEBITED: { userId, amount, reason, transactionId }

3. EVENT PUBLISHER
Create src/events/publisher.ts:

class EventPublisher:
  async publish(event: DomainEvent):
    // Add to event log (append-only table)
    // Dispatch to appropriate queue
    // Track publish timestamp

  async publishBatch(events: DomainEvent[]):
    // Atomic batch publish

4. EVENT HANDLERS / WORKERS
Create src/workers/ directory:

notification.worker.ts:
- Processes notifications queue
- Sends push notifications via Firebase/APNs
- Sends SMS via Twilio (for critical alerts)
- Handles delivery failures with retry

trip-events.worker.ts:
- TRIP_REQUESTED → Trigger matching service
- TRIP_MATCHED → Notify customer, update driver state
- TRIP_COMPLETED → Calculate earnings, update wallets, trigger payment

payment.worker.ts:
- Process payment callbacks
- Retry failed payments (exponential backoff)
- Update wallet balances
- Trigger reconciliation

analytics.worker.ts:
- Log events to analytics store
- Update real-time dashboards
- Calculate metrics

5. DEAD LETTER QUEUE
Create src/queues/deadLetter.ts:

- Failed jobs after max retries → DLQ
- Store full job context for debugging
- Alert on DLQ growth
- Manual retry interface

DLQ handling:
- Notifications: Log and alert support team
- Payments: Critical alert, manual review required
- Trip events: Attempt recovery, escalate if fails

6. EVENT STORE (Event Sourcing)
Create src/db/migrations/005_event_store.sql:

CREATE TABLE event_store (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sequence_number BIGINT NOT NULL
);

CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_type, aggregate_id, sequence_number);
CREATE INDEX idx_event_store_type ON event_store(event_type, created_at);

-- Ensure no gaps in sequence
CREATE UNIQUE INDEX idx_event_store_sequence ON event_store(aggregate_type, aggregate_id, sequence_number);

7. SAGA PATTERN FOR COMPLEX FLOWS
Create src/sagas/tripSaga.ts:

Trip completion saga:
1. Mark trip completed
2. Calculate final price
3. Process payment (cash/wallet/card)
4. Credit driver earnings
5. Deduct platform fee
6. Update driver stats
7. Send receipt notification

If any step fails:
- Log failure point
- Trigger compensating actions if needed
- Retry from failure point
- Alert if unrecoverable

8. REAL-TIME NOTIFICATIONS (Replacing Supabase Realtime for scale)
Create src/services/realtime.ts:

For customer app (during active trip):
- Use Socket.io for direct connection
- Subscribe to trip-specific room
- Receive driver location, status updates

For driver app:
- Use Socket.io for trip offers
- Receive targeted notifications
- Update availability in real-time

Fallback to Supabase Realtime for:
- Low-traffic features
- Admin dashboard
- Background sync

9. BACKPRESSURE HANDLING
Create src/queues/backpressure.ts:

Implement circuit breaker pattern:
- If queue depth > threshold, reject new jobs
- Return 503 to client with retry-after header
- Gradually accept new jobs as queue drains

Priority queues:
- CRITICAL: Payments, trip status changes
- HIGH: Driver matching, notifications
- NORMAL: Analytics, non-urgent updates
- LOW: Cleanup, batch processing

10. IDEMPOTENCY
Create src/middleware/idempotency.ts:

For all state-changing operations:
- Accept Idempotency-Key header
- Store operation result in Redis (24h TTL)
- Return cached result for duplicate requests
- Prevent duplicate payments, double-bookings

11. OUTBOX PATTERN
Create src/db/migrations/006_outbox.sql:

For reliable event publishing:

CREATE TABLE outbox (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending'
);

Worker polls outbox and publishes to queue:
- Atomic: DB write + outbox insert in same transaction
- Ensures no events lost on crash
- Marks as published after successful queue add

12. MONITORING & ALERTS
Queue metrics to track:
- Queue depth per queue
- Processing time per job type
- Failure rate per queue
- DLQ size
- Worker health

Alerts:
- Queue depth > 1000: Warning
- Queue depth > 5000: Critical
- DLQ > 100: Investigate
- Worker down: Page on-call

Testing Requirements:
- Simulate worker crash during job processing
- Verify job retry works correctly
- Test idempotency (submit same request twice)
- Verify DLQ captures failed jobs
- Load test queue throughput (1000 jobs/second)

DO NOT:
- Process payments synchronously
- Ignore failed jobs
- Lose events on system crash
- Allow duplicate event processing
- Block request cycle for non-critical operations
```

---

## Phase 6: Pricing, Surge & ETA Engine

### What Will Break First
- **No surge pricing** means unprofitable during peak demand
- **Static pricing** doesn't account for traffic, distance, time
- **No ETA calculation** on backend (relies on frontend only)
- **Price manipulation** possible without server-side validation

### Implementation Prompt for Phase 6

```
PROMPT: Dynamic Pricing, Surge & ETA Engine for SmartLine Backend

Context: You are building a pricing and ETA engine for a ride-hailing app. Current state has fixed pricing with no surge, no traffic consideration, and no server-side ETA calculation. The system must calculate fair, dynamic prices based on real-time conditions.

Goals:
- Implement surge pricing based on supply/demand
- Calculate accurate ETAs using traffic data
- Server-side price validation
- Transparent pricing breakdown for customers
- Commission optimization for profitability

Tasks to Complete:

1. PRICING SERVICE ARCHITECTURE
Create src/services/pricing/pricingService.ts

Price calculation inputs:
- Pickup location (lat, lng)
- Destination location (lat, lng)
- Vehicle type (economy, comfort, premium, xl)
- Time of request
- Current demand/supply ratio
- Traffic conditions
- Special events (if any)

Price calculation formula:
basePrice = baseFare + (distanceKm * perKmRate) + (durationMin * perMinRate)
surgeMultiplier = calculateSurge(pickup, demand/supply ratio)
trafficAdjustment = calculateTrafficAdjustment(route, currentTraffic)
timeAdjustment = calculateTimeOfDayAdjustment(requestTime)
finalPrice = basePrice * surgeMultiplier * trafficAdjustment * timeAdjustment
finalPrice = max(minimumFare, finalPrice)
finalPrice = round(finalPrice, 2)

2. PRICING CONFIGURATION
Create src/db/migrations/007_pricing_config.sql:

CREATE TABLE pricing_config (
  id SERIAL PRIMARY KEY,
  vehicle_type VARCHAR(50) NOT NULL UNIQUE,
  base_fare NUMERIC(10,2) NOT NULL,
  per_km_rate NUMERIC(10,2) NOT NULL,
  per_minute_rate NUMERIC(10,2) NOT NULL,
  minimum_fare NUMERIC(10,2) NOT NULL,
  booking_fee NUMERIC(10,2) DEFAULT 0,
  cancellation_fee NUMERIC(10,2) DEFAULT 0,
  platform_commission_percent NUMERIC(5,2) NOT NULL,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time-based pricing multipliers
CREATE TABLE time_pricing (
  id SERIAL PRIMARY KEY,
  day_of_week INT, -- 0=Sunday, 1=Monday, etc. NULL=all days
  start_hour INT NOT NULL,
  end_hour INT NOT NULL,
  multiplier NUMERIC(3,2) NOT NULL,
  description TEXT
);

-- Special event pricing
CREATE TABLE event_pricing (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location GEOGRAPHY(POLYGON, 4326),
  radius_meters INT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  multiplier NUMERIC(3,2) NOT NULL
);

Sample data:
INSERT INTO pricing_config (vehicle_type, base_fare, per_km_rate, per_minute_rate, minimum_fare, platform_commission_percent)
VALUES
  ('economy', 10.00, 3.50, 0.50, 15.00, 15.00),
  ('comfort', 15.00, 5.00, 0.75, 25.00, 18.00),
  ('premium', 25.00, 8.00, 1.00, 40.00, 20.00),
  ('xl', 20.00, 6.00, 0.80, 35.00, 17.00);

INSERT INTO time_pricing (day_of_week, start_hour, end_hour, multiplier, description)
VALUES
  (NULL, 7, 9, 1.2, 'Morning rush hour'),
  (NULL, 17, 20, 1.3, 'Evening rush hour'),
  (NULL, 23, 5, 1.1, 'Late night'),
  (5, 20, 23, 1.4, 'Friday night');

3. SURGE PRICING ENGINE
Create src/services/pricing/surgeEngine.ts

Surge calculation:
- Divide city into hexagonal zones (H3 library)
- Track requests per zone (last 10 minutes)
- Track available drivers per zone
- Calculate demand/supply ratio

Install: npm install h3-js

surgeMultiplier = calculateSurgeForZone(zoneId):
  requests = getRecentRequests(zoneId, 10 minutes)
  drivers = getAvailableDrivers(zoneId)
  ratio = requests / max(drivers, 1)

  if ratio < 1.0: return 1.0 (no surge)
  if ratio < 1.5: return 1.1
  if ratio < 2.0: return 1.3
  if ratio < 3.0: return 1.5
  if ratio < 4.0: return 1.8
  return min(ratio * 0.5, 3.0) // Cap at 3x

Surge smoothing:
- Don't spike suddenly (gradual increase)
- Maintain surge for minimum 5 minutes
- Display surge warning to customer before booking

Store surge data in Redis:
- Key: surge:{h3Index}
- Value: { multiplier, lastUpdated, requestCount, driverCount }
- TTL: 5 minutes

4. ETA CALCULATION SERVICE
Create src/services/eta/etaService.ts

Use external routing API (Google Maps, MapBox, OSRM):

async calculateETA(origin, destination):
  route = await routingAPI.getRoute(origin, destination)
  return {
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
    polyline: route.polyline,
    trafficDelay: route.trafficDelay
  }

async calculateDriverETA(driverLocation, pickupLocation):
  return await calculateETA(driverLocation, pickupLocation)

async calculateTripETA(pickupLocation, destinationLocation):
  return await calculateETA(pickupLocation, destinationLocation)

Caching strategy:
- Cache routes for 5 minutes
- Cache key: route:{originH3}:{destH3}
- Invalidate on significant traffic change

5. PRICE QUOTE GENERATION
Create src/services/pricing/quoteService.ts

async generateQuote(request: QuoteRequest): Promise<PriceQuote>
  // Calculate route
  route = await etaService.calculateETA(request.pickup, request.destination)

  // Get pricing config
  config = await getPricingConfig(request.vehicleType)

  // Calculate base price
  basePrice = config.baseFare
    + (route.distanceKm * config.perKmRate)
    + (route.durationMinutes * config.perMinuteRate)

  // Apply surge
  surgeMultiplier = await surgeEngine.getSurge(request.pickup)

  // Apply time adjustment
  timeMultiplier = await getTimeMultiplier(request.requestTime)

  // Apply event pricing
  eventMultiplier = await getEventMultiplier(request.pickup, request.requestTime)

  // Calculate final
  finalPrice = basePrice * surgeMultiplier * timeMultiplier * eventMultiplier
  finalPrice = Math.max(config.minimumFare, finalPrice)

  // Generate quote ID (for validation later)
  quoteId = generateQuoteId()

  // Store quote (expires in 10 minutes)
  await redis.setex(`quote:${quoteId}`, 600, JSON.stringify({
    ...request,
    basePrice,
    surgeMultiplier,
    finalPrice,
    route,
    createdAt: Date.now()
  }))

  return {
    quoteId,
    price: roundToNearest(finalPrice, 0.5), // Round to nearest 0.50
    priceBreakdown: {
      baseFare: config.baseFare,
      distanceCharge: route.distanceKm * config.perKmRate,
      timeCharge: route.durationMinutes * config.perMinuteRate,
      surgeMultiplier,
      surgeAmount: (surgeMultiplier - 1) * basePrice,
      total: finalPrice
    },
    eta: {
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes
    },
    expiresAt: Date.now() + 600000
  }

6. PRICE VALIDATION ON BOOKING
Create src/services/pricing/priceValidator.ts

When trip is created:
1. Retrieve stored quote by quoteId
2. Verify quote not expired
3. Verify pickup/destination match
4. Verify vehicle type matches
5. Recalculate current price
6. Allow if within 10% tolerance (traffic may have changed)
7. Reject if price manipulation detected

async validatePrice(tripRequest):
  storedQuote = await redis.get(`quote:${tripRequest.quoteId}`)

  if (!storedQuote) throw new Error('Quote expired')

  quote = JSON.parse(storedQuote)

  // Verify locations match
  if (distance(tripRequest.pickup, quote.pickup) > 100m)
    throw new Error('Pickup location changed')

  // Verify price not tampered
  if (tripRequest.price !== quote.price)
    throw new Error('Price mismatch')

  // Check if conditions changed significantly
  currentSurge = await surgeEngine.getSurge(tripRequest.pickup)
  if (currentSurge > quote.surgeMultiplier * 1.5)
    return { valid: false, newQuote: await generateQuote(tripRequest) }

  return { valid: true, quote }

7. FARE ESTIMATION API
Create endpoints:

POST /api/pricing/estimate
Body: {
  pickup: { lat, lng },
  destination: { lat, lng },
  vehicleTypes: ['economy', 'comfort', 'premium'] // optional, default all
}
Response: {
  estimates: [
    {
      vehicleType: 'economy',
      quoteId: 'abc123',
      price: 45.00,
      priceRange: { min: 42.00, max: 52.00 },
      eta: { pickup: 5, trip: 25 },
      surgeMultiplier: 1.3,
      breakdown: {...}
    },
    ...
  ],
  surgeActive: true,
  surgeMessage: "Prices are higher due to increased demand"
}

GET /api/pricing/surge-map
Query: { lat, lng, radius }
Response: {
  zones: [
    { center: {lat, lng}, multiplier: 1.5, level: 'high' },
    ...
  ]
}

8. DRIVER EARNINGS CALCULATION
Create src/services/pricing/earningsService.ts

After trip completion:
  tripPrice = trip.finalPrice

  // Get commission rate
  commissionRate = config.platformCommissionPercent / 100

  // Calculate platform fee
  platformFee = tripPrice * commissionRate

  // Calculate driver earnings
  driverEarnings = tripPrice - platformFee

  // Handle payment method
  if (trip.paymentMethod === 'cash'):
    // Driver collected cash, deduct platform fee from wallet
    await walletService.debit(trip.driverId, platformFee, 'PLATFORM_FEE')
  else:
    // We collected payment, credit driver earnings
    await walletService.credit(trip.driverId, driverEarnings, 'TRIP_EARNINGS')

9. PRICING ANALYTICS
Track metrics:
- Average price per km by zone
- Surge frequency and duration
- Price acceptance rate
- Revenue per trip
- Driver earnings distribution

10. A/B TESTING FOR PRICING
Create src/services/pricing/pricingExperiment.ts

Framework for testing pricing changes:
- Variant A: Current pricing
- Variant B: New pricing formula
- Split traffic 50/50
- Measure: conversion rate, revenue, driver supply

Testing Requirements:
- Verify price quote matches trip price
- Test surge multiplier bounds (never > 3x)
- Verify earnings calculation accuracy
- Test quote expiration
- Benchmark pricing calculation (< 100ms)

DO NOT:
- Allow client-side price manipulation
- Apply surge > 3x without approval
- Calculate prices without caching
- Expose internal pricing formulas to client
- Change prices after customer confirmation
```

---

## Phase 7: Payments & Financial Integrity

### What Will Break First
- **Non-atomic wallet operations** cause balance inconsistencies
- **No idempotency** means duplicate payments possible
- **Synchronous payment processing** blocks requests
- **No reconciliation** means undetected discrepancies
- **No audit trail** for financial transactions

### At What Scale It Breaks
- 100 concurrent payments: Race conditions occur
- Any network failure: Lost payment confirmations
- Monthly audit: Discrepancies discovered too late

### Implementation Prompt for Phase 7

```
PROMPT: Payment System & Financial Integrity for SmartLine Backend

Context: You are rebuilding the payment system for a ride-hailing app to ensure financial integrity at scale. Current issues include non-atomic wallet operations, no idempotency, synchronous processing, and no reconciliation system.

Current Payment Flow:
- Kashier integration for deposits
- Wallet balance stored in database
- Cash and wallet payment methods
- Platform commission deducted on trip completion

Target State:
- Double-entry bookkeeping
- Idempotent operations
- Event-sourced transactions
- Automated reconciliation
- Fraud detection

Tasks to Complete:

1. DOUBLE-ENTRY BOOKKEEPING
Create src/db/migrations/008_financial_ledger.sql:

-- Account types for double-entry
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type VARCHAR(50) NOT NULL, -- 'CUSTOMER_WALLET', 'DRIVER_WALLET', 'PLATFORM_REVENUE', 'CASH_FLOAT', 'PAYMENT_GATEWAY_PENDING'
  owner_id UUID, -- user_id for wallets, NULL for system accounts
  currency VARCHAR(3) DEFAULT 'EGP',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_type, owner_id)
);

-- Immutable ledger entries
CREATE TABLE ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(15,2) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction groups (ties debits and credits together)
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(50) NOT NULL, -- 'DEPOSIT', 'TRIP_PAYMENT', 'WITHDRAWAL', 'COMMISSION', 'REFUND'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  idempotency_key VARCHAR(255) UNIQUE,
  reference_type VARCHAR(50), -- 'TRIP', 'WITHDRAWAL_REQUEST', 'DEPOSIT'
  reference_id UUID,
  total_amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EGP',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for fast balance lookups
CREATE INDEX idx_ledger_account_time ON ledger_entries(account_id, created_at DESC);
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);

-- Ensure debits = credits for each transaction
CREATE OR REPLACE FUNCTION verify_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debits NUMERIC;
  total_credits NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0)
  INTO total_debits, total_credits
  FROM ledger_entries
  WHERE transaction_id = NEW.id;

  IF total_debits != total_credits THEN
    RAISE EXCEPTION 'Transaction % is unbalanced: debits=%, credits=%',
      NEW.id, total_debits, total_credits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

2. WALLET SERVICE WITH ATOMIC OPERATIONS
Create src/services/wallet/walletService.ts:

class WalletService:

  async getBalance(userId: string): Promise<number>
    // Get latest balance from ledger
    const latestEntry = await db.query(`
      SELECT balance_after FROM ledger_entries
      WHERE account_id = (SELECT id FROM accounts WHERE owner_id = $1 AND account_type = 'CUSTOMER_WALLET')
      ORDER BY created_at DESC LIMIT 1
    `, [userId])
    return latestEntry?.balance_after || 0

  async credit(userId: string, amount: number, reason: string, idempotencyKey: string): Promise<Transaction>
    return await this.executeTransaction({
      type: 'CREDIT',
      userId,
      amount,
      reason,
      idempotencyKey
    })

  async debit(userId: string, amount: number, reason: string, idempotencyKey: string): Promise<Transaction>
    // Check balance first
    const balance = await this.getBalance(userId)
    if (balance < amount) {
      throw new InsufficientBalanceError(balance, amount)
    }
    return await this.executeTransaction({
      type: 'DEBIT',
      userId,
      amount,
      reason,
      idempotencyKey
    })

  private async executeTransaction(params): Promise<Transaction>
    // Check idempotency
    const existing = await db.query(
      'SELECT * FROM financial_transactions WHERE idempotency_key = $1',
      [params.idempotencyKey]
    )
    if (existing) return existing // Return cached result

    // Execute in transaction with row-level lock
    return await db.transaction(async (tx) => {
      // Lock the account row
      const account = await tx.query(
        'SELECT * FROM accounts WHERE owner_id = $1 FOR UPDATE',
        [params.userId]
      )

      // Get current balance
      const currentBalance = await this.getBalanceInTx(tx, account.id)

      // Calculate new balance
      const newBalance = params.type === 'CREDIT'
        ? currentBalance + params.amount
        : currentBalance - params.amount

      if (newBalance < 0) {
        throw new InsufficientBalanceError(currentBalance, params.amount)
      }

      // Create transaction record
      const transaction = await tx.query(`
        INSERT INTO financial_transactions
        (transaction_type, idempotency_key, total_amount, status)
        VALUES ($1, $2, $3, 'completed')
        RETURNING *
      `, [params.reason, params.idempotencyKey, params.amount])

      // Create ledger entry
      await tx.query(`
        INSERT INTO ledger_entries
        (transaction_id, account_id, entry_type, amount, balance_after, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [transaction.id, account.id, params.type, params.amount, newBalance, params.reason])

      // Create balancing entry to system account
      const systemAccount = params.type === 'CREDIT' ? 'CASH_FLOAT' : 'PLATFORM_REVENUE'
      const systemEntry = params.type === 'CREDIT' ? 'DEBIT' : 'CREDIT'
      await tx.query(`
        INSERT INTO ledger_entries
        (transaction_id, account_id, entry_type, amount, balance_after, description)
        VALUES ($1, (SELECT id FROM accounts WHERE account_type = $2), $3, $4, 0, $5)
      `, [transaction.id, systemAccount, systemEntry, params.amount, params.reason])

      return transaction
    })

3. TRIP PAYMENT FLOW
Create src/services/payment/tripPaymentService.ts:

async processCompletedTrip(tripId: string, idempotencyKey: string):
  const trip = await tripRepository.findById(tripId)

  // Calculate amounts
  const totalPrice = trip.finalPrice
  const commissionRate = await getCommissionRate(trip.carType)
  const platformFee = totalPrice * commissionRate
  const driverEarnings = totalPrice - platformFee

  // Create master transaction
  const transaction = await db.transaction(async (tx) => {
    const txn = await tx.query(`
      INSERT INTO financial_transactions
      (transaction_type, reference_type, reference_id, total_amount, idempotency_key, status)
      VALUES ('TRIP_PAYMENT', 'TRIP', $1, $2, $3, 'processing')
      RETURNING *
    `, [tripId, totalPrice, idempotencyKey])

    if (trip.paymentMethod === 'wallet') {
      // Debit customer wallet
      await this.createLedgerEntry(tx, {
        transactionId: txn.id,
        accountType: 'CUSTOMER_WALLET',
        ownerId: trip.customerId,
        entryType: 'DEBIT',
        amount: totalPrice
      })

      // Credit driver wallet
      await this.createLedgerEntry(tx, {
        transactionId: txn.id,
        accountType: 'DRIVER_WALLET',
        ownerId: trip.driverId,
        entryType: 'CREDIT',
        amount: driverEarnings
      })

      // Credit platform revenue
      await this.createLedgerEntry(tx, {
        transactionId: txn.id,
        accountType: 'PLATFORM_REVENUE',
        entryType: 'CREDIT',
        amount: platformFee
      })

    } else if (trip.paymentMethod === 'cash') {
      // Driver collected cash
      // Credit driver cash float
      await this.createLedgerEntry(tx, {
        transactionId: txn.id,
        accountType: 'DRIVER_WALLET',
        ownerId: trip.driverId,
        entryType: 'CREDIT',
        amount: totalPrice
      })

      // Debit driver wallet for platform fee
      await this.createLedgerEntry(tx, {
        transactionId: txn.id,
        accountType: 'DRIVER_WALLET',
        ownerId: trip.driverId,
        entryType: 'DEBIT',
        amount: platformFee
      })

      // Credit platform revenue
      await this.createLedgerEntry(tx, {
        transactionId: txn.id,
        accountType: 'PLATFORM_REVENUE',
        entryType: 'CREDIT',
        amount: platformFee
      })
    }

    // Mark complete
    await tx.query(
      'UPDATE financial_transactions SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', txn.id]
    )

    return txn
  })

  // Emit event
  await eventPublisher.publish({
    type: 'TRIP_PAYMENT_COMPLETED',
    tripId,
    transactionId: transaction.id
  })

4. PAYMENT GATEWAY INTEGRATION (Improved)
Create src/services/payment/kashierService.ts:

async initiateDeposit(userId: string, amount: number, idempotencyKey: string):
  // Create pending transaction first
  const pendingTx = await db.query(`
    INSERT INTO financial_transactions
    (transaction_type, reference_type, total_amount, idempotency_key, status, metadata)
    VALUES ('DEPOSIT', 'PAYMENT_GATEWAY', $1, $2, 'pending', $3)
    RETURNING *
  `, [amount, idempotencyKey, { userId, gateway: 'kashier' }])

  // Generate Kashier payment URL
  const orderId = pendingTx.id
  const paymentUrl = await this.generateKashierUrl(orderId, amount)

  return { orderId, paymentUrl }

async handleWebhook(payload: KashierWebhook):
  // Verify signature
  if (!this.verifySignature(payload)) {
    throw new InvalidSignatureError()
  }

  // Find pending transaction (use orderId)
  const pendingTx = await db.query(
    'SELECT * FROM financial_transactions WHERE id = $1 AND status = $2',
    [payload.orderId, 'pending']
  )

  if (!pendingTx) {
    // Already processed (idempotent)
    return { success: true, alreadyProcessed: true }
  }

  if (payload.status === 'SUCCESS') {
    await db.transaction(async (tx) => {
      // Credit user wallet
      await walletService.credit(
        pendingTx.metadata.userId,
        pendingTx.total_amount,
        'DEPOSIT',
        `deposit-${pendingTx.id}`
      )

      // Update transaction status
      await tx.query(
        'UPDATE financial_transactions SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', pendingTx.id]
      )
    })
  } else {
    await db.query(
      'UPDATE financial_transactions SET status = $1, metadata = metadata || $2 WHERE id = $3',
      ['failed', { failureReason: payload.error }, pendingTx.id]
    )
  }

5. RECONCILIATION SYSTEM
Create src/services/payment/reconciliationService.ts:

Daily reconciliation job:
- Sum all ledger entries by type
- Compare against expected totals
- Flag discrepancies for review

async runDailyReconciliation(date: Date):
  const report = {
    date,
    checks: [],
    discrepancies: []
  }

  // Check 1: Total debits = Total credits
  const totals = await db.query(`
    SELECT
      SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
      SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits
    FROM ledger_entries
    WHERE created_at::date = $1
  `, [date])

  if (totals.total_debits !== totals.total_credits) {
    report.discrepancies.push({
      type: 'BALANCE_MISMATCH',
      expected: totals.total_debits,
      actual: totals.total_credits
    })
  }

  // Check 2: Completed trips have payment transactions
  const unprocessedTrips = await db.query(`
    SELECT t.id FROM trips t
    LEFT JOIN financial_transactions ft ON ft.reference_id = t.id AND ft.reference_type = 'TRIP'
    WHERE t.status = 'completed'
    AND t.created_at::date = $1
    AND ft.id IS NULL
  `, [date])

  // Check 3: Gateway transactions match our records
  const gatewayTransactions = await kashierService.getDailyTransactions(date)
  // Compare with our pending/completed deposits

  // Check 4: Wallet balances match latest ledger entries
  const balanceMismatches = await db.query(`
    SELECT u.id, u.balance as stored_balance,
           (SELECT balance_after FROM ledger_entries le
            WHERE le.account_id = a.id ORDER BY created_at DESC LIMIT 1) as ledger_balance
    FROM users u
    JOIN accounts a ON a.owner_id = u.id
    WHERE u.balance != (SELECT balance_after FROM ledger_entries le
                        WHERE le.account_id = a.id ORDER BY created_at DESC LIMIT 1)
  `)

  return report

6. WITHDRAWAL PROCESSING (Improved)
Create src/services/payment/withdrawalService.ts:

async requestWithdrawal(driverId: string, amount: number, method: string, accountNumber: string):
  // Verify balance
  const balance = await walletService.getBalance(driverId)
  if (balance < amount) {
    throw new InsufficientBalanceError(balance, amount)
  }

  // Create withdrawal request
  const request = await db.query(`
    INSERT INTO withdrawal_requests
    (driver_id, amount, method, account_number, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *
  `, [driverId, amount, method, accountNumber])

  // Hold the amount (create pending transaction)
  await db.query(`
    INSERT INTO financial_transactions
    (transaction_type, reference_type, reference_id, total_amount, status)
    VALUES ('WITHDRAWAL_HOLD', 'WITHDRAWAL_REQUEST', $1, $2, 'pending')
  `, [request.id, amount])

  // Don't debit yet - wait for admin approval

  return request

async approveWithdrawal(requestId: string, adminId: string):
  const request = await db.query(
    'SELECT * FROM withdrawal_requests WHERE id = $1 AND status = $2 FOR UPDATE',
    [requestId, 'pending']
  )

  if (!request) throw new Error('Request not found or already processed')

  await db.transaction(async (tx) => {
    // Debit driver wallet
    await walletService.debit(
      request.driver_id,
      request.amount,
      'WITHDRAWAL',
      `withdrawal-${requestId}`
    )

    // Update request status
    await tx.query(
      'UPDATE withdrawal_requests SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3',
      ['approved', adminId, requestId]
    )

    // TODO: Trigger actual bank transfer via payment gateway
    // This should be async with confirmation callback
  })

7. FRAUD DETECTION
Create src/services/payment/fraudDetection.ts:

Detect suspicious patterns:
- Rapid deposits followed by withdrawals
- Multiple failed payment attempts
- Unusual trip patterns (circular trips)
- Balance manipulation attempts

async checkForFraud(userId: string, transactionType: string, amount: number):
  const flags = []

  // Check 1: Velocity - too many transactions in short time
  const recentTxCount = await db.query(`
    SELECT COUNT(*) FROM financial_transactions
    WHERE metadata->>'userId' = $1
    AND created_at > NOW() - INTERVAL '1 hour'
  `, [userId])
  if (recentTxCount > 10) flags.push('HIGH_VELOCITY')

  // Check 2: Amount anomaly
  const avgAmount = await getAverageTransactionAmount(userId)
  if (amount > avgAmount * 10) flags.push('UNUSUAL_AMOUNT')

  // Check 3: Deposit-withdraw pattern
  const pattern = await db.query(`
    SELECT
      SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN total_amount ELSE 0 END) as deposits,
      SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN total_amount ELSE 0 END) as withdrawals
    FROM financial_transactions
    WHERE metadata->>'userId' = $1
    AND created_at > NOW() - INTERVAL '24 hours'
  `, [userId])
  if (pattern.withdrawals > pattern.deposits * 0.9) flags.push('RAPID_WITHDRAWAL')

  if (flags.length > 0) {
    await alertService.notify('FRAUD_ALERT', { userId, flags, transaction: { type: transactionType, amount } })
  }

  return { blocked: flags.includes('BLOCKED'), flags }

8. FINANCIAL REPORTING
Create src/services/payment/reportingService.ts:

async generateDailyReport(date: Date):
  return {
    totalTrips: await db.query('SELECT COUNT(*) FROM trips WHERE created_at::date = $1 AND status = $2', [date, 'completed']),
    totalRevenue: await db.query('SELECT SUM(final_price) FROM trips WHERE created_at::date = $1 AND status = $2', [date, 'completed']),
    platformFees: await db.query('SELECT SUM(amount) FROM ledger_entries WHERE account_id = (SELECT id FROM accounts WHERE account_type = $1) AND created_at::date = $2', ['PLATFORM_REVENUE', date]),
    deposits: ...,
    withdrawals: ...,
    outstandingBalances: ...
  }

Testing Requirements:
- Verify no balance goes negative
- Test concurrent transactions (race conditions)
- Verify idempotency (submit same transaction twice)
- Test reconciliation catches errors
- Verify ledger entries always balance
- Test failure scenarios (network error mid-transaction)

DO NOT:
- Allow negative balances
- Process same transaction twice
- Update balance outside of ledger
- Skip signature verification on webhooks
- Store card numbers (use gateway tokens only)
```

---

## Phase 8: Infrastructure & DevOps

### What Will Break First
- **Single server deployment** is a single point of failure
- **No container orchestration** means manual scaling
- **No CI/CD** leads to risky deployments
- **No infrastructure as code** makes recovery difficult

### Implementation Prompt for Phase 8

```
PROMPT: Infrastructure & DevOps Setup for SmartLine Backend

Context: You are setting up production infrastructure for a ride-hailing backend. Current state is likely manual deployment with no containerization, no CI/CD, and no infrastructure as code.

Goals:
- Containerize the application
- Set up Kubernetes for orchestration
- Implement CI/CD pipelines
- Configure auto-scaling
- Set up multiple environments (dev, staging, prod)

Tasks to Complete:

1. DOCKERIZATION
Create Dockerfile:

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
USER nodejs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

Create docker-compose.yml for local development:
- app: The backend service
- redis: For caching and queues
- postgres: Local database (or connect to Supabase)
- worker: Background job processor

Create .dockerignore:
- node_modules
- .env
- .git
- *.log
- dist

2. KUBERNETES MANIFESTS
Create k8s/ directory:

deployment.yaml:
- Multiple replicas (3 minimum in prod)
- Resource limits and requests
- Liveness and readiness probes
- Environment variables from secrets
- Rolling update strategy

service.yaml:
- ClusterIP service
- Load balancing across pods

ingress.yaml:
- SSL termination
- Path-based routing
- Rate limiting annotations

hpa.yaml (Horizontal Pod Autoscaler):
- Scale based on CPU/memory
- Min replicas: 3
- Max replicas: 20
- Scale up threshold: 70% CPU
- Scale down threshold: 30% CPU

configmap.yaml:
- Non-sensitive configuration
- Feature flags

secrets.yaml:
- Database credentials
- JWT secret
- API keys
- (Use external secrets manager in production)

3. CI/CD PIPELINE
Create .github/workflows/ci.yml:

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: azure/k8s-deploy@v4
        with:
          manifests: k8s/staging/
          images: ghcr.io/${{ github.repository }}:${{ github.sha }}

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: azure/k8s-deploy@v4
        with:
          manifests: k8s/production/
          images: ghcr.io/${{ github.repository }}:${{ github.sha }}
          strategy: canary
          percentage: 20

4. ENVIRONMENT CONFIGURATION
Create environments:

Development:
- Local Docker Compose
- Supabase local emulator
- Redis container
- Hot reloading enabled

Staging:
- Kubernetes namespace: smartline-staging
- Staging Supabase project
- Reduced resources
- Test payment gateway (sandbox mode)

Production:
- Kubernetes namespace: smartline-production
- Production Supabase project
- Full resources
- Live payment gateway
- Multi-region (future)

5. SECRETS MANAGEMENT
Integrate with secrets manager:
- AWS Secrets Manager or
- HashiCorp Vault or
- GCP Secret Manager

Create src/config/secrets.ts:
- Load secrets from environment in dev
- Load from secrets manager in production
- Automatic rotation support

6. INFRASTRUCTURE AS CODE
Create terraform/ directory (or use Pulumi):

main.tf:
- Kubernetes cluster (EKS/GKE/AKS)
- Redis cluster (Elasticache/Cloud Memorystore)
- Network configuration (VPC, subnets)
- IAM roles and policies
- Load balancer configuration

modules/:
- kubernetes/
- redis/
- networking/
- monitoring/

7. DATABASE MIGRATION IN CI/CD
Add migration step to deployment:

migrate-job.yaml:
- Kubernetes Job
- Runs before deployment
- Executes database migrations
- Rollback on failure

Create src/db/migrate.ts:
- Read migration files
- Track applied migrations
- Apply pending migrations
- Support rollback

8. HEALTH CHECKS
Create src/routes/healthRoutes.ts:

GET /health/live
- Returns 200 if process is running
- Used by Kubernetes liveness probe

GET /health/ready
- Checks database connection
- Checks Redis connection
- Returns 200 if all dependencies healthy
- Used by Kubernetes readiness probe

GET /health/startup
- More thorough checks
- Used by Kubernetes startup probe

9. GRACEFUL SHUTDOWN
Create src/utils/shutdown.ts:

Handle SIGTERM signal:
1. Stop accepting new requests
2. Wait for in-flight requests (30s timeout)
3. Close database connections
4. Close Redis connections
5. Close queue workers
6. Exit process

10. LOGGING CONFIGURATION
Create src/config/logging.ts:

- Structured JSON logging (for log aggregation)
- Log levels by environment
- Request ID propagation
- Sensitive data masking
- Log rotation (if file-based)

Recommended: Use Pino for performance

11. BACKUP AND DISASTER RECOVERY
Document procedures:
- Database backup schedule (automated via Supabase)
- Point-in-time recovery testing
- Cross-region backup (for production)
- Disaster recovery runbook

12. DEPLOYMENT STRATEGIES
Configure in k8s manifests:

Rolling Update (default):
- maxSurge: 25%
- maxUnavailable: 0

Canary (for risky changes):
- Deploy to 20% of traffic
- Monitor metrics
- Promote or rollback

Blue-Green (for major versions):
- Deploy new version alongside old
- Switch traffic atomically
- Easy rollback

Testing Requirements:
- Verify Docker image builds successfully
- Test Kubernetes deployment locally (minikube/kind)
- Verify health checks work correctly
- Test graceful shutdown
- Verify CI/CD pipeline runs end-to-end

DO NOT:
- Store secrets in Docker images
- Use latest tag in production
- Deploy without health checks
- Skip database migrations in deployments
- Hardcode environment-specific values
```

---

## Phase 9: Monitoring & Observability

### What Will Break First
- **No metrics** means issues discovered by users first
- **No distributed tracing** makes debugging impossible
- **No alerting** means slow incident response
- **No log aggregation** means searching across servers manually

### Implementation Prompt for Phase 9

```
PROMPT: Monitoring & Observability Stack for SmartLine Backend

Context: You are implementing comprehensive monitoring and observability for a ride-hailing backend. The system currently has minimal logging and no metrics collection. You need to implement the three pillars: metrics, logs, and traces.

Goals:
- Real-time system health visibility
- Fast incident detection and response
- Performance optimization insights
- User experience monitoring
- Cost optimization data

Tasks to Complete:

1. METRICS COLLECTION (Prometheus)
Create src/middleware/metrics.ts:

Install: npm install prom-client

Default metrics:
- HTTP request duration (histogram)
- HTTP request count (counter)
- Active connections (gauge)
- Node.js metrics (memory, CPU, event loop lag)

Custom metrics:
// Business metrics
const tripRequestsTotal = new Counter({
  name: 'smartline_trip_requests_total',
  help: 'Total trip requests',
  labelNames: ['status', 'payment_method', 'vehicle_type']
})

const tripDurationSeconds = new Histogram({
  name: 'smartline_trip_duration_seconds',
  help: 'Trip duration from request to completion',
  labelNames: ['status'],
  buckets: [60, 300, 600, 1800, 3600]
})

const activeTrips = new Gauge({
  name: 'smartline_active_trips',
  help: 'Currently active trips',
  labelNames: ['status']
})

const onlineDrivers = new Gauge({
  name: 'smartline_online_drivers',
  help: 'Currently online drivers',
  labelNames: ['vehicle_type', 'city']
})

const matchingDurationMs = new Histogram({
  name: 'smartline_matching_duration_ms',
  help: 'Time to match rider with driver',
  buckets: [100, 500, 1000, 5000, 10000, 30000]
})

const paymentProcessingDurationMs = new Histogram({
  name: 'smartline_payment_processing_duration_ms',
  help: 'Payment processing time',
  labelNames: ['method', 'status']
})

const walletBalance = new Gauge({
  name: 'smartline_total_wallet_balance',
  help: 'Total wallet balance across all users',
  labelNames: ['user_type']
})

// Infrastructure metrics
const dbQueryDurationMs = new Histogram({
  name: 'smartline_db_query_duration_ms',
  help: 'Database query duration',
  labelNames: ['query_type', 'table']
})

const redisOperationDurationMs = new Histogram({
  name: 'smartline_redis_operation_duration_ms',
  help: 'Redis operation duration',
  labelNames: ['operation']
})

const queueDepth = new Gauge({
  name: 'smartline_queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name']
})

Expose metrics endpoint:
GET /metrics
- Prometheus format
- Protected (internal only or API key)

2. DISTRIBUTED TRACING (OpenTelemetry)
Create src/config/tracing.ts:

Install: npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node

Initialize tracing at app startup:
- Auto-instrument HTTP, database, Redis
- Trace ID propagation in headers
- Sampling strategy (10% in production)
- Export to Jaeger/Zipkin/Tempo

Custom spans for business logic:
const tracer = trace.getTracer('smartline-backend')

async function matchRiderWithDriver(tripId: string) {
  return tracer.startActiveSpan('match-rider-driver', async (span) => {
    span.setAttribute('trip.id', tripId)

    // Find nearby drivers
    const driversSpan = tracer.startSpan('find-nearby-drivers')
    const drivers = await findNearbyDrivers()
    driversSpan.end()

    // Rank drivers
    const rankSpan = tracer.startSpan('rank-drivers')
    const ranked = await rankDrivers(drivers)
    rankSpan.end()

    span.setAttribute('drivers.found', drivers.length)
    span.setAttribute('drivers.ranked', ranked.length)
    span.end()

    return ranked
  })
}

3. STRUCTURED LOGGING
Create src/config/logger.ts:

Install: npm install pino pino-pretty

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['password', 'token', 'authorization', 'creditCard']
})

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now()
  const requestId = req.headers['x-request-id'] || uuid()

  req.log = logger.child({ requestId, path: req.path, method: req.method })

  res.on('finish', () => {
    req.log.info({
      duration: Date.now() - start,
      statusCode: res.statusCode,
      userId: req.user?.id
    }, 'request completed')
  })

  next()
}

Log context to include:
- Request ID (for correlation)
- User ID (when authenticated)
- Trip ID (for trip-related operations)
- Duration
- Error stack traces (on errors only)

4. LOG AGGREGATION
Choose and configure:
- ELK Stack (Elasticsearch, Logstash, Kibana) or
- Loki + Grafana or
- CloudWatch Logs

Ship logs from containers:
- Use Fluent Bit sidecar
- Parse JSON logs
- Add Kubernetes metadata
- Index by date

5. ERROR TRACKING (Sentry)
Create src/config/sentry.ts:

Install: npm install @sentry/node

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Postgres()
  ]
})

// Capture unhandled errors
app.use(Sentry.Handlers.errorHandler())

// Custom error capture with context
try {
  await processPayment(...)
} catch (error) {
  Sentry.captureException(error, {
    tags: { paymentMethod, userId },
    extra: { tripId, amount }
  })
  throw error
}

6. DASHBOARDS (Grafana)
Create dashboards:

Business Dashboard:
- Trips per hour (line chart)
- Active trips (gauge)
- Online drivers (gauge)
- Revenue today (stat)
- Trip completion rate (percentage)
- Average wait time (stat)
- Popular routes (heatmap)

Infrastructure Dashboard:
- Request rate (line chart)
- Error rate (line chart)
- Response time p50/p95/p99 (line chart)
- Database connections (gauge)
- Redis memory usage (gauge)
- Queue depths (bar chart)
- Pod CPU/memory (per pod)

Payment Dashboard:
- Transaction volume (line chart)
- Failed payments (counter)
- Average transaction value (stat)
- Payment method breakdown (pie chart)
- Reconciliation status (stat)

7. ALERTING RULES
Create alerts in Prometheus/Grafana:

Critical (page on-call):
- Error rate > 5% for 5 minutes
- Response time p99 > 5 seconds for 5 minutes
- Payment failure rate > 10% for 5 minutes
- Database connection failure
- Redis connection failure
- No trips completed in 30 minutes (during business hours)
- All workers down

Warning (Slack notification):
- Error rate > 1% for 10 minutes
- Response time p95 > 2 seconds for 10 minutes
- Queue depth > 1000 for 5 minutes
- Memory usage > 80%
- CPU usage > 80%
- Online drivers < 10 (in active cities)

Info (logged, no notification):
- Deployment started
- Deployment completed
- Daily reconciliation completed
- Feature flag changed

8. UPTIME MONITORING
Configure external monitoring:
- Pingdom or UptimeRobot or AWS Route53 health checks
- Monitor from multiple regions
- Check critical endpoints:
  - GET /health/ready
  - POST /api/auth/check-phone (synthetic)
  - GET /api/pricing/estimate (synthetic)

9. REAL USER MONITORING (RUM)
Track client-side metrics:
- App startup time
- API call latency (from client perspective)
- Error rates in mobile app
- Crash reports
- User journey funnels

Integrate with:
- Firebase Analytics
- Amplitude
- Mixpanel

10. SLOs AND SLIs
Define service level objectives:

Availability:
- SLO: 99.9% uptime
- SLI: Successful requests / Total requests

Latency:
- SLO: p95 < 500ms for API calls
- SLI: 95th percentile response time

Matching Speed:
- SLO: 80% of trips matched within 60 seconds
- SLI: Trips matched within 60s / Total trip requests

Payment Success:
- SLO: 99% payment success rate
- SLI: Successful payments / Total payment attempts

Create SLO dashboard with error budget burn rate.

11. INCIDENT MANAGEMENT
Set up incident workflow:
- PagerDuty or Opsgenie for on-call
- Runbooks for common incidents
- Post-mortem template
- Status page for users

Testing Requirements:
- Verify metrics endpoint returns valid Prometheus format
- Test alert rules trigger correctly
- Verify traces propagate across services
- Test log aggregation captures all logs
- Verify Sentry captures errors with context

DO NOT:
- Log sensitive data (passwords, tokens, PII)
- Create too many high-cardinality labels
- Alert on every small anomaly (alert fatigue)
- Skip setting up PagerDuty rotation
- Ignore error budget burn rate
```

---

## Phase 10: Testing & Quality Assurance

### What Will Break First
- **No automated tests** means regressions go unnoticed
- **No integration tests** means broken deployments
- **No load tests** means surprises under traffic
- **No chaos testing** means unknown failure modes

### Implementation Prompt for Phase 10

```
PROMPT: Comprehensive Testing Strategy for SmartLine Backend

Context: You are implementing a testing strategy for a ride-hailing backend. The goal is to achieve high confidence in deployments through automated testing at multiple levels.

Testing Pyramid:
- Unit tests (70%): Fast, isolated tests for business logic
- Integration tests (20%): Tests with real dependencies
- E2E tests (10%): Full user journey tests

Tasks to Complete:

1. UNIT TESTING SETUP
Install: npm install -D jest @types/jest ts-jest

Create jest.config.js:
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
}

Create tests/setup.ts:
- Mock external services
- Set up test database connection
- Configure test environment variables

2. UNIT TEST EXAMPLES
Create src/services/pricing/__tests__/pricingService.test.ts:

describe('PricingService', () => {
  describe('calculateBasePrice', () => {
    it('should calculate correct base price for economy', () => {
      const result = pricingService.calculateBasePrice({
        distanceKm: 10,
        durationMin: 20,
        vehicleType: 'economy'
      })
      expect(result).toBe(55) // 10 base + 35 distance + 10 time
    })

    it('should enforce minimum fare', () => {
      const result = pricingService.calculateBasePrice({
        distanceKm: 1,
        durationMin: 2,
        vehicleType: 'economy'
      })
      expect(result).toBe(15) // Minimum fare
    })

    it('should apply surge multiplier correctly', () => {
      const result = pricingService.applyMultipliers({
        basePrice: 100,
        surgeMultiplier: 1.5,
        timeMultiplier: 1.0
      })
      expect(result).toBe(150)
    })
  })
})

Create src/services/matching/__tests__/matchingService.test.ts:

describe('MatchingService', () => {
  describe('calculateDriverScore', () => {
    it('should rank closer drivers higher', () => {
      const closeDriver = { distance: 1, rating: 4.5, acceptanceRate: 0.8 }
      const farDriver = { distance: 5, rating: 4.5, acceptanceRate: 0.8 }

      const closeScore = matchingService.calculateDriverScore(closeDriver)
      const farScore = matchingService.calculateDriverScore(farDriver)

      expect(closeScore).toBeGreaterThan(farScore)
    })

    it('should balance distance and rating', () => {
      const closeWithLowRating = { distance: 1, rating: 3.0, acceptanceRate: 0.8 }
      const farWithHighRating = { distance: 3, rating: 5.0, acceptanceRate: 0.95 }

      // Highly rated driver should sometimes beat closer driver
      const score1 = matchingService.calculateDriverScore(closeWithLowRating)
      const score2 = matchingService.calculateDriverScore(farWithHighRating)

      expect(score2).toBeGreaterThan(score1)
    })
  })

  describe('filterEligibleDrivers', () => {
    it('should exclude offline drivers', () => {
      const drivers = [
        { id: '1', isOnline: true, status: 'approved' },
        { id: '2', isOnline: false, status: 'approved' }
      ]
      const result = matchingService.filterEligibleDrivers(drivers)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should exclude drivers on active trips', () => {
      const drivers = [
        { id: '1', isOnline: true, status: 'approved', currentTripId: null },
        { id: '2', isOnline: true, status: 'approved', currentTripId: 'trip-123' }
      ]
      const result = matchingService.filterEligibleDrivers(drivers)
      expect(result).toHaveLength(1)
    })
  })
})

3. INTEGRATION TESTING
Install: npm install -D supertest @testcontainers/postgresql

Create tests/integration/tripFlow.test.ts:

describe('Trip Flow Integration', () => {
  let app: Express
  let db: PostgreSqlContainer

  beforeAll(async () => {
    db = await new PostgreSqlContainer().start()
    process.env.DATABASE_URL = db.getConnectionUri()
    app = await createApp()
  })

  afterAll(async () => {
    await db.stop()
  })

  it('should create trip, match driver, and complete', async () => {
    // Create customer
    const customer = await request(app)
      .post('/api/auth/signup')
      .send({ phone: '+201234567890', password: 'test1234', role: 'customer', name: 'Test' })

    // Create driver
    const driver = await request(app)
      .post('/api/auth/signup')
      .send({ phone: '+201234567891', password: 'test1234', role: 'driver', name: 'Driver' })

    // Set driver online
    await request(app)
      .post('/api/drivers/status')
      .set('Authorization', `Bearer ${driver.body.token}`)
      .send({ isOnline: true, lat: 30.0444, lng: 31.2357 })

    // Create trip
    const trip = await request(app)
      .post('/api/trips/request')
      .set('Authorization', `Bearer ${customer.body.token}`)
      .send({
        pickup: { lat: 30.0444, lng: 31.2357 },
        destination: { lat: 30.0500, lng: 31.2400 },
        vehicleType: 'economy'
      })

    expect(trip.status).toBe(201)
    expect(trip.body.tripId).toBeDefined()

    // Driver accepts
    await request(app)
      .post(`/api/trips/${trip.body.tripId}/driver-response`)
      .set('Authorization', `Bearer ${driver.body.token}`)
      .send({ action: 'accept' })

    // Complete trip
    await request(app)
      .post(`/api/trips/${trip.body.tripId}/status`)
      .set('Authorization', `Bearer ${driver.body.token}`)
      .send({ status: 'completed' })

    // Verify final state
    const finalTrip = await request(app)
      .get(`/api/trips/${trip.body.tripId}`)
      .set('Authorization', `Bearer ${customer.body.token}`)

    expect(finalTrip.body.status).toBe('completed')
    expect(finalTrip.body.driverId).toBe(driver.body.user.id)
  })
})

4. PAYMENT INTEGRATION TESTS
Create tests/integration/payment.test.ts:

describe('Payment Integration', () => {
  it('should process wallet payment atomically', async () => {
    // Setup: Customer with 100 EGP balance
    const customer = await createTestCustomer({ balance: 100 })
    const driver = await createTestDriver()

    // Create and complete trip (50 EGP)
    const trip = await createCompletedTrip(customer, driver, { price: 50 })

    // Verify balances
    const customerBalance = await getBalance(customer.id)
    const driverBalance = await getBalance(driver.id)

    expect(customerBalance).toBe(50) // 100 - 50
    expect(driverBalance).toBe(42.5) // 50 - 15% commission
  })

  it('should prevent double payment on concurrent requests', async () => {
    const customer = await createTestCustomer({ balance: 100 })
    const trip = await createTestTrip(customer, { price: 50 })

    // Simulate concurrent completion attempts
    const results = await Promise.all([
      completeTrip(trip.id),
      completeTrip(trip.id),
      completeTrip(trip.id)
    ])

    // Only one should succeed
    const successes = results.filter(r => r.success)
    expect(successes).toHaveLength(1)

    // Balance should be deducted only once
    const balance = await getBalance(customer.id)
    expect(balance).toBe(50)
  })

  it('should handle insufficient balance gracefully', async () => {
    const customer = await createTestCustomer({ balance: 10 })
    const trip = await createTestTrip(customer, { price: 50, paymentMethod: 'wallet' })

    const result = await completeTrip(trip.id)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Insufficient balance')
    expect(await getTripStatus(trip.id)).toBe('payment_failed')
  })
})

5. LOAD TESTING (k6)
Install k6: https://k6.io/docs/get-started/installation/

Create tests/load/trip-creation.js:

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const tripCreationDuration = new Trend('trip_creation_duration')

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.01'],              // Error rate under 1%
  }
}

export default function() {
  // Login
  const loginRes = http.post(`${__ENV.BASE_URL}/api/auth/login`, {
    phone: `+2012345${__VU}${__ITER}`,
    password: 'test1234'
  })

  const token = loginRes.json('token')

  // Request trip
  const start = Date.now()
  const tripRes = http.post(
    `${__ENV.BASE_URL}/api/trips/request`,
    JSON.stringify({
      pickup: { lat: 30.0444 + Math.random() * 0.01, lng: 31.2357 + Math.random() * 0.01 },
      destination: { lat: 30.0500, lng: 31.2400 },
      vehicleType: 'economy'
    }),
    { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )
  tripCreationDuration.add(Date.now() - start)

  check(tripRes, {
    'trip created': (r) => r.status === 201,
    'has trip id': (r) => r.json('tripId') !== undefined
  })

  errorRate.add(tripRes.status !== 201)

  sleep(1)
}

Create tests/load/location-updates.js:

// Simulate 1000 drivers updating location every 3 seconds

export const options = {
  vus: 1000,
  duration: '10m',
  thresholds: {
    http_req_duration: ['p(99)<100'],  // Location updates must be fast
    errors: ['rate<0.001'],
  }
}

export default function() {
  http.post(`${__ENV.BASE_URL}/api/location/update`, {
    lat: 30.0 + Math.random() * 0.5,
    lng: 31.0 + Math.random() * 0.5,
    heading: Math.random() * 360,
    speed: Math.random() * 60,
    timestamp: new Date().toISOString()
  }, {
    headers: { 'Authorization': `Bearer ${__ENV.DRIVER_TOKEN}` }
  })

  sleep(3)  // Update every 3 seconds
}

6. CHAOS TESTING
Create tests/chaos/ directory:

Database failure test:
- Simulate database connection failure
- Verify graceful degradation
- Verify recovery when database returns

Redis failure test:
- Simulate Redis connection failure
- Verify fallback to database
- Verify location updates are queued

Payment gateway failure test:
- Simulate Kashier timeout
- Verify retry logic
- Verify user sees appropriate error

Network partition test:
- Simulate network latency spikes
- Verify timeout handling
- Verify circuit breaker activation

Use Chaos Monkey or LitmusChaos in Kubernetes.

7. CONTRACT TESTING (API)
Install: npm install -D @pact-foundation/pact

Create tests/contracts/customer-api.pact.ts:

Verify API contract between:
- Mobile app ↔ Backend
- Backend ↔ Payment gateway
- Backend ↔ Notification service

8. SECURITY TESTING
Create tests/security/ directory:

Authentication tests:
- Test expired token rejection
- Test invalid token rejection
- Test role-based access control
- Test token refresh flow

Authorization tests:
- Customer cannot access driver endpoints
- Driver cannot access other driver's data
- Cannot access other user's trips

Input validation tests:
- SQL injection attempts
- XSS payload handling
- Invalid coordinate handling
- Negative amount handling

Use OWASP ZAP for automated scanning.

9. TEST DATA MANAGEMENT
Create tests/fixtures/ directory:
- customers.json
- drivers.json
- trips.json

Create tests/factories/:
- customerFactory.ts
- driverFactory.ts
- tripFactory.ts

Create database seeding scripts for different scenarios.

10. CI TEST CONFIGURATION
Update .github/workflows/ci.yml:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:15-3.3
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - run: npm run test:integration

  load-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/load/trip-creation.js

Testing Requirements:
- Unit test coverage > 80%
- All integration tests pass
- Load test meets SLO thresholds
- No security vulnerabilities (high/critical)
- Contract tests pass

DO NOT:
- Skip tests in CI
- Use production data in tests
- Hardcode test credentials
- Leave flaky tests in the suite
- Test implementation details (test behavior)
```

---

## Phase 11: API Gateway & Rate Limiting

### Implementation Prompt for Phase 11

```
PROMPT: API Gateway & Rate Limiting for SmartLine Backend

Context: You are implementing API gateway patterns and rate limiting to protect the backend from abuse and ensure fair usage. Current state has no rate limiting and direct access to the backend.

Goals:
- Protect against DDoS and abuse
- Implement fair usage limits
- Add request throttling
- API versioning
- Request/response transformation

Tasks to Complete:

1. RATE LIMITING MIDDLEWARE
Install: npm install rate-limiter-flexible

Create src/middleware/rateLimiter.ts:

Different limits for different endpoints:

Authentication:
- /auth/login: 10 requests per minute per IP
- /auth/signup: 5 requests per minute per IP
- /auth/check-phone: 20 requests per minute per IP

Trip operations:
- /trips/request: 5 requests per minute per user
- /trips/*/driver-response: 30 requests per minute per user (drivers)
- /trips/*/status: 20 requests per minute per user

Location updates:
- /location/update: 20 requests per minute per user (every 3 seconds)
- /location/nearby: 60 requests per minute per user

Pricing:
- /pricing/estimate: 30 requests per minute per user

Implementation:
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 10,          // Number of requests
  duration: 60,        // Per 60 seconds
  blockDuration: 60,   // Block for 60 seconds if exceeded
})

export const rateLimitMiddleware = (options) => async (req, res, next) => {
  try {
    const key = req.user?.id || req.ip
    await rateLimiter.consume(key)
    next()
  } catch (error) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: error.msBeforeNext / 1000
    })
  }
}

2. API VERSIONING
Create src/routes/v1/ directory structure:
- v1/authRoutes.ts
- v1/tripRoutes.ts
- v1/locationRoutes.ts

Mount routes:
app.use('/api/v1', v1Routes)
app.use('/api/v2', v2Routes) // Future

Version in headers:
- Accept: application/vnd.smartline.v1+json
- Or query param: ?version=1

3. REQUEST VALIDATION GATEWAY
Create src/middleware/requestValidator.ts:

- Validate content-type
- Validate content-length (max 1MB)
- Validate required headers
- Strip unknown fields
- Normalize request data

4. RESPONSE TRANSFORMATION
Create src/middleware/responseTransformer.ts:

Standard response format:
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}

Error response format:
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Your wallet balance is too low",
    "details": { "required": 50, "available": 30 }
  },
  "meta": { ... }
}

5. API KEY MANAGEMENT (for external integrations)
Create src/middleware/apiKey.ts:

- Generate API keys for partners
- Validate API key on requests
- Track usage per API key
- Rate limit per API key

6. CORS CONFIGURATION
Create src/middleware/cors.ts:

Configure by environment:
- Development: Allow localhost
- Production: Allow specific domains only
- Credentials: Only from allowed origins

7. REQUEST TIMEOUT
Create src/middleware/timeout.ts:

- Default timeout: 30 seconds
- Location updates: 5 seconds
- Price calculations: 10 seconds
- Long-running: 120 seconds (reports)

8. CIRCUIT BREAKER
Install: npm install opossum

Create src/middleware/circuitBreaker.ts:

Protect external services:
- Payment gateway
- Routing API (Google Maps/MapBox)
- SMS provider
- Push notification service

Configuration:
const breaker = new CircuitBreaker(asyncFunction, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
})

breaker.fallback(() => cachedResponse)

9. REQUEST DEDUPLICATION
Create src/middleware/deduplication.ts:

For non-idempotent operations:
- Store request hash in Redis
- TTL: 5 seconds
- Return cached response for duplicates

10. API DOCUMENTATION
Install: npm install swagger-jsdoc swagger-ui-express

Create src/docs/swagger.ts:

Document all endpoints:
- Request/response schemas
- Authentication requirements
- Rate limits
- Error codes

Serve at /api/docs

Testing Requirements:
- Verify rate limits work correctly
- Test circuit breaker activation
- Verify API versioning routes
- Test timeout handling
- Verify CORS configuration

DO NOT:
- Allow unlimited requests
- Expose internal errors to clients
- Skip API documentation
- Use hardcoded rate limits (make configurable)
```

---

## Phase 12: Disaster Recovery & High Availability

### Implementation Prompt for Phase 12

```
PROMPT: Disaster Recovery & High Availability for SmartLine Backend

Context: You are implementing disaster recovery and high availability measures for a ride-hailing backend. The system must maintain operations even during partial failures and recover quickly from disasters.

Goals:
- 99.9% availability SLA
- Recovery Time Objective (RTO): 15 minutes
- Recovery Point Objective (RPO): 5 minutes
- Automatic failover for critical components

Tasks to Complete:

1. MULTI-REGION ARCHITECTURE (Future)
Document strategy for:
- Active-Active deployment (Cairo + Alexandria)
- Database replication across regions
- Redis cluster with cross-region sync
- DNS-based traffic routing

2. DATABASE HIGH AVAILABILITY
Supabase managed:
- Automatic backups (configured in dashboard)
- Point-in-time recovery (24 hours)
- Read replicas (for scaling reads)

Document recovery procedures:
- How to restore from backup
- How to fail over to replica
- How to handle split-brain scenarios

3. REDIS HIGH AVAILABILITY
Configure Redis Sentinel or Cluster:
- 3 node minimum (1 primary, 2 replicas)
- Automatic failover
- Persistence configuration (RDB + AOF)

Application connection:
- Use Sentinel-aware client
- Automatic reconnection
- Fallback to database if Redis unavailable

4. APPLICATION REDUNDANCY
Kubernetes configuration:
- Minimum 3 replicas per service
- Pod anti-affinity (spread across nodes)
- Node anti-affinity (spread across zones)
- PodDisruptionBudget (maxUnavailable: 1)

5. GRACEFUL DEGRADATION
Create src/services/degradation.ts:

Feature flags for degraded modes:
- MATCHING_DEGRADED: Use simple distance-only matching
- SURGE_DISABLED: No surge pricing
- LOCATION_HISTORY_DISABLED: Skip history writes
- ANALYTICS_DISABLED: Skip non-critical analytics
- NOTIFICATIONS_DEGRADED: Critical only

Automatic degradation based on system health:
- If Redis down → Enable MATCHING_DEGRADED
- If high load → Enable ANALYTICS_DISABLED
- If payment gateway slow → Queue payments

6. DATA BACKUP STRATEGY
Document backup procedures:

Database:
- Continuous backup via Supabase
- Daily full backup export
- Weekly backup to cold storage (S3/GCS)
- Monthly backup verification test

Redis:
- RDB snapshots every 15 minutes
- AOF persistence for minimal data loss
- Daily backup to object storage

Event store:
- Immutable by design
- Replicated to backup region
- Can replay events to rebuild state

7. DISASTER RECOVERY RUNBOOKS
Create runbooks/ directory:

runbooks/database-failure.md:
1. Identify failure type (connection, corruption, full disk)
2. Check Supabase status page
3. If regional failure: Wait for Supabase failover
4. If data corruption: Restore from backup
5. Verify data integrity
6. Resume operations

runbooks/complete-outage.md:
1. Communicate status to users
2. Identify root cause
3. Restore database from backup
4. Restore Redis from backup
5. Deploy application
6. Verify all services healthy
7. Resume operations
8. Post-mortem

runbooks/payment-reconciliation.md:
1. Identify missing transactions
2. Query payment gateway for status
3. Reconcile with local records
4. Process missing transactions
5. Verify balances

8. FAILOVER TESTING
Schedule regular tests:
- Monthly: Redis failover test
- Quarterly: Database failover test
- Annually: Full disaster recovery drill

Document test procedures and results.

9. STATUS PAGE
Set up status page (Statuspage.io or similar):
- Component status (API, Payments, Matching)
- Incident history
- Scheduled maintenance
- Subscribe for updates

10. INCIDENT RESPONSE
Create incident response plan:
- On-call rotation schedule
- Escalation procedures
- Communication templates
- Post-mortem template

Severity levels:
- SEV1: Complete outage (all hands, 15min response)
- SEV2: Major feature broken (on-call, 30min response)
- SEV3: Minor issue (next business day)

11. DATA RETENTION POLICY
Define retention periods:
- Trip data: 7 years (legal requirement)
- Location history: 90 days
- Logs: 30 days
- Metrics: 1 year
- User data: Until account deletion + 30 days

Implement automated cleanup jobs.

12. COMPLIANCE & AUDIT
Document for compliance:
- Data encryption at rest and in transit
- Access control audit logs
- PCI DSS compliance for payments
- GDPR compliance for user data

Testing Requirements:
- Test database failover
- Test Redis failover
- Test graceful degradation
- Verify backup restoration
- Test runbook procedures

DO NOT:
- Skip backup testing
- Have single points of failure
- Ignore compliance requirements
- Skip incident post-mortems
```

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Dependencies |
|-------|----------|--------|--------|--------------|
| 1. Security | P0 (Critical) | Medium | Blocks production | None |
| 2. Database | P0 (Critical) | Medium | Performance | Phase 1 |
| 7. Payments | P0 (Critical) | High | Financial integrity | Phase 1, 2 |
| 3. Location | P1 (High) | High | Core functionality | Phase 2 |
| 4. Matching | P1 (High) | High | User experience | Phase 2, 3 |
| 5. Events | P1 (High) | Medium | Reliability | Phase 2 |
| 6. Pricing | P2 (Medium) | Medium | Revenue | Phase 2, 3 |
| 8. DevOps | P2 (Medium) | Medium | Operations | Phase 1 |
| 9. Monitoring | P2 (Medium) | Medium | Visibility | Phase 8 |
| 10. Testing | P2 (Medium) | High | Quality | Phase 1-7 |
| 11. API Gateway | P3 (Low) | Low | Protection | Phase 1 |
| 12. DR/HA | P3 (Low) | High | Resilience | All |

---

## Execution Timeline (Recommended)

### Sprint 1-2: Foundation (P0)
- Phase 1: Security hardening
- Phase 2: Database optimization
- Basic monitoring setup

### Sprint 3-4: Core Features (P1)
- Phase 7: Payment integrity
- Phase 5: Event-driven architecture
- Phase 3: Location tracking

### Sprint 5-6: Scale Preparation (P1)
- Phase 4: Matching engine
- Phase 6: Pricing engine
- Phase 8: CI/CD setup

### Sprint 7-8: Operations (P2)
- Phase 9: Full observability
- Phase 10: Testing suite
- Phase 11: API gateway

### Sprint 9-10: Resilience (P3)
- Phase 12: Disaster recovery
- Load testing and optimization
- Documentation and runbooks

---

## Cost Estimates (Monthly, Production)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| Supabase Pro | $25-100 | Depends on database size |
| Redis (Managed) | $50-200 | Elasticache/Cloud Memorystore |
| Kubernetes | $100-500 | Depends on scale |
| Monitoring (Datadog/similar) | $100-300 | Depends on hosts/metrics |
| Error tracking (Sentry) | $26-80 | Team plan |
| External APIs (Maps, SMS) | $100-500 | Usage-based |
| **Total** | **$400-1700** | Scales with usage |

---

## Summary

This plan transforms SmartLine from an MVP to a production-ready, scalable platform. Key transformations:

1. **Security**: From exposed credentials to zero-trust architecture
2. **Database**: From unindexed tables to optimized geospatial queries
3. **Location**: From no tracking to real-time Redis-backed system
4. **Matching**: From manual bidding to intelligent automated dispatch
5. **Events**: From synchronous to event-driven architecture
6. **Pricing**: From static to dynamic surge-based pricing
7. **Payments**: From racy operations to double-entry ledger
8. **Infrastructure**: From single server to Kubernetes orchestration
9. **Observability**: From blind to full metrics/logs/traces
10. **Testing**: From none to comprehensive automated testing

Each phase includes a detailed implementation prompt that can be used to guide development. Execute in priority order, validate each phase before moving to the next.
