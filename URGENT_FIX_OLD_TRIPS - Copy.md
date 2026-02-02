# 🔧 URGENT FIX: Stop Old Trips from Showing

## The Problem
The driver app keeps showing the old trip `d2798acf-7b18-42e5-bcdf-45a2de06a95f` because:
1. This trip is stuck in "requested" status in the database
2. The polling code keeps finding it every 5 seconds

## Quick Fix (2 minutes)

### Option 1: Disable Polling in Code
1. Open `smartline-app/src/screens/Driver/DriverHomeScreen.tsx`
2. Find line 162 (search for "FALLBACK: Poll for new trips")
3. Replace lines 162-199 with:

```tsx
            // Polling DISABLED - using Realtime only
            pollInterval = null;
```

4. Save the file
5. The app will reload automatically

### Option 2: Clean Up Database (RECOMMENDED)
Run this SQL in Supabase Dashboard:

```sql
-- Cancel all old requested trips
UPDATE trips 
SET status = 'cancelled' 
WHERE status = 'requested' 
AND created_at < NOW() - INTERVAL '1 hour';

-- Or delete them entirely
DELETE FROM trips 
WHERE status = 'requested' 
AND created_at < NOW() - INTERVAL '1 hour';
```

This will clean up any old trips stuck in "requested" status.

## Why This Happens

The polling code looks for ANY trip with status='requested':

```tsx
const { data } = await supabase
    .from('trips')
    .select('*')
    .eq('status', 'requested')  // ← Finds old trips too!
    .order('created_at', { ascending: false })
    .limit(1);
```

The old trip `d2798acf-7b18-42e5-bcdf-45a2de06a95f` is still in "requested" status, so it keeps getting found.

## Best Solution

1. **Clean the database** (Option 2 above) to remove old trips
2. **Disable polling** (Option 1 above) since Realtime is working
3. **Rely on Realtime only** - it will show new trips instantly

## After the Fix

You should see:
```
LOG  [Realtime] ✅ Successfully subscribed to trip inbox!
```

And NO MORE:
```
LOG  [Driver] 🔄 Polling for new trips...
```

When a customer creates a NEW trip, you'll see:
```
LOG  [Realtime] 🆕 NEW TRIP ARRIVED!
```

---

**Status:** Ready to apply
**Time needed:** 2 minutes
**Difficulty:** Easy
