# ✅ FIXED: Cancel Trip Navigation

## Problem
- When canceling a trip in `SearchingDriverScreen`, the app was going back to the previous screen incorrectly or crashing due to missing params.
- `TripOptions` screen expects `pickup`, `destination`, and `destinationCoordinates`.

## Solution
Updated the cancel logic to:
1. **Cancel the trip** in Supabase (`status: 'cancelled'`).
2. **Fetch trip details** from the database (`pickup_address`, `dest_address`, `dest_lat`, `dest_lng`).
3. **Navigate to `TripOptions`** with the correct parameters so the user can modify their request or try again.

## Code Changes

### File: `SearchingDriverScreen.tsx`

**Updated Cancel Handler:**
```typescript
onPress: async () => {
    // 1. Cancel the trip
    await supabase.from('trips').update({ status: 'cancelled' }).eq('id', tripId);

    // 2. Fetch trip details
    const { data: trip } = await supabase
        .from('trips')
        .select('pickup_address, dest_address, dest_lat, dest_lng')
        .eq('id', tripId)
        .single();

    if (trip) {
            // 3. Navigate back to TripOptions with the locations
        navigation.navigate('TripOptions', {
            pickup: trip.pickup_address,
            destination: trip.dest_address,
            destinationCoordinates: [trip.dest_lng, trip.dest_lat] // [lng, lat]
        });
    } else {
        navigation.goBack();
    }
}
```

## Verification
- Canceling a trip now properly repopulates the "Choose a ride" screen.
- Correctly uses `dest_address` column name.
- Correctly passes `[lng, lat]` coordinates for Mapbox.

---
**Status:** ✅ Complete
