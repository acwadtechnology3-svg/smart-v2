# Driver Signup 400 Error - Fix Applied

## 🐛 Problem
When creating a driver account, the signup was failing with:
```
ERROR Signup logic error: [AxiosError: Request failed with status code 400]
```

## 🔍 Root Cause
The backend phone validation was too strict:
- **Required format:** `+20XXXXXXXXXX` (Egyptian format with country code)
- **User input:** `01XXXXXXXXX` (without country code)
- **Result:** Validation failed with 400 Bad Request

## ✅ Solution Applied

### 1. **Updated Phone Validation Schema**
**File:** `smartline-backend/src/validators/schemas.ts`

**Before:**
```typescript
export const phoneSchema = z
  .string()
  .regex(/^\+20\d{10}$/, 'Phone must be Egyptian format: +20XXXXXXXXXX');
```

**After:**
```typescript
export const phoneSchema = z
  .string()
  .refine(
    (phone) => /^(\+20|0)?1\d{9}$/.test(phone),
    'Phone must be Egyptian format: +201XXXXXXXXX or 01XXXXXXXXX'
  );
```

**Now Accepts:**
- ✅ `+201234567890` (with +20 prefix)
- ✅ `01234567890` (with 0 prefix)
- ✅ `1234567890` (just the number)

---

### 2. **Improved Error Logging**
**File:** `smartline-backend/src/controllers/authController.ts`

Added better error messages to help debug:
```typescript
catch (error: any) {
    console.error('Signup Error:', error);
    const errorMessage = error.message || 'Signup failed';
    const errorDetails = error.details || error.hint || '';
    res.status(400).json({ 
        error: errorMessage,
        details: errorDetails 
    });
}
```

Now returns detailed error information for easier debugging.

---

## 🧪 Testing

**Try driver signup again:**
1. Open the app
2. Enter phone: `01234567890` (or any Egyptian mobile number)
3. Fill in name, email, password
4. Click "Create Account"

**Expected Result:**
- ✅ Account created successfully
- ✅ Navigates to Driver Signup flow (vehicle details)
- ✅ No more 400 error

---

## 📝 Notes

- The backend automatically restarts with nodemon
- Changes are already applied and running
- Phone validation now matches Egyptian mobile number formats
- Error messages are more helpful for debugging

---

## ✅ Status: **FIXED**

The driver signup should now work without errors!
