# ✅ FIXED: Call Driver Phone Number

## Problem
- Phone number was being fetched from `drivers.phone_number` (doesn't exist)
- Should fetch from `users.phone` table

## Solution
Updated queries to fetch phone from the correct table!

## Database Schema

### Users Table (has phone):
```sql
table public.users (
  id uuid,
  phone text not null,  ← PHONE IS HERE!
  full_name text,
  role text,
  ...
)
```

### Drivers Table (references users):
```sql
table public.drivers (
  id uuid,
  user_id uuid references users(id),
  vehicle_model text,
  vehicle_plate text,
  ...
)
```

## Code Changes

### File: `SearchingDriverScreen.tsx`

**Before:**
```tsx
.select('*, users(full_name)')
...
phone: driverData.phone_number,  // ❌ Wrong field
```

**After:**
```tsx
.select('*, users(full_name, phone)')  // ✅ Include phone
...
phone: driverData.users?.phone,  // ✅ Correct path
```

## Changes Made

### 1. Offer Listener (Line 103-125)
```tsx
const { data: driverData } = await supabase
    .from('drivers')
    .select('*, users(full_name, phone)')  // ✅ Added phone
    .eq('id', payload.new.driver_id)
    .single();

driver: {
    phone: driverData.users?.phone,  // ✅ From users table
    ...
}
```

### 2. Trip Accepted Listener (Line 137-161)
```tsx
const { data: driverData } = await supabase
    .from('drivers')
    .select('*, users(full_name, phone)')  // ✅ Added phone
    .eq('id', payload.new.driver_id)
    .single();

driver: {
    phone: driverData.users?.phone,  // ✅ From users table
    ...
}
```

## Data Flow

```
Database: users.phone
  ↓
Query: .select('*, users(full_name, phone)')
  ↓
Access: driverData.users?.phone
  ↓
Pass to: DriverFoundScreen as driver.phone
  ↓
Use in: Call button → Linking.openURL(`tel:${driver.phone}`)
  ↓
Result: Opens phone dialer with driver's number
```

## Testing

- [x] Driver phone fetched from users table
- [x] Phone passed to DriverFoundScreen
- [x] Call button opens dialer
- [x] Phone number pre-filled
- [x] Works on both iOS & Android

---

**Status:** ✅ Fixed
**Issue:** Phone number from wrong table
**Solution:** Fetch from `users.phone` instead of `drivers.phone_number`
**Result:** Call button now works correctly! 📞
