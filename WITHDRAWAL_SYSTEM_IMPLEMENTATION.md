# Withdrawal Request System - Complete Implementation

## ✅ **System Overview**

Drivers can now request withdrawals from their wallet balance through the mobile app. Admins review and approve/reject these requests from the dashboard.

---

## 📱 **Driver App - Wallet & Withdrawal**

### **Screen:** `DriverWalletScreen.tsx`
**Location:** `smartline-app/src/screens/Driver/DriverWalletScreen.tsx`

**Features:**
- ✅ View wallet balance
- ✅ View total earnings
- ✅ View pending withdrawals
- ✅ Request withdrawal with:
  - Amount input
  - Payment method selection (Bank Transfer / Vodafone Cash)
  - Account number input
- ✅ View withdrawal request history with status
- ✅ Deposit functionality (Kashier integration)

**API Endpoints Used:**
- `GET /wallet/summary` - Get balance and transactions
- `POST /payment/withdraw/request` - Submit withdrawal request

**Request Format:**
```json
{
  "amount": 500.00,
  "method": "bank_transfer",
  "accountNumber": "1234567890"
}
```

---

## 💼 **Admin Dashboard - Withdrawal Management**

### **Page:** `WithdrawalRequests.tsx`
**Location:** `smartline-command-center/src/pages/WithdrawalRequests.tsx`

**Features:**
- ✅ View all withdrawal requests
- ✅ Filter by status (Pending / Approved / Rejected)
- ✅ Summary cards showing:
  - Pending requests count and total amount
  - Approved requests today
  - Total requests
- ✅ Review dialog with:
  - Driver information
  - Request details
  - Admin note field
  - Approve/Reject actions

**API Endpoints Used:**
- `GET withdrawal_requests` (via Supabase) - Fetch all requests
- `POST /api/payment/withdraw/manage` - Approve/reject requests

**Request Format:**
```json
{
  "requestId": "uuid",
  "action": "approve" | "reject",
  "adminNote": "Optional note"
}
```

---

## 🔧 **Backend Implementation**

### **Controller:** `paymentController.ts`
**Location:** `smartline-backend/src/controllers/paymentController.ts`

#### **1. Request Withdrawal** (`requestWithdrawal`)
- **Route:** `POST /payment/withdraw/request`
- **Auth:** Required (Driver only)
- **Validation:** `withdrawRequestSchema`

**Process:**
1. Get driver ID from authenticated user
2. Check wallet balance
3. Create pending withdrawal request
4. Return success response

**Changes Made:**
- ✅ Updated to use `req.user.id` instead of `driverId` from body
- ✅ Removed `driverId` from validation schema

#### **2. Manage Withdrawal** (`manageWithdrawal`)
- **Route:** `POST /payment/withdraw/manage`
- **Auth:** Required (Admin only)
- **Validation:** `withdrawManageSchema`

**Process (Approve):**
1. Fetch withdrawal request
2. Verify request is pending
3. Check driver's current balance
4. Deduct amount from wallet
5. Create wallet transaction record
6. Update request status to 'approved'

**Process (Reject):**
1. Update request status to 'rejected'
2. Add admin note (required for rejection)

---

## 🗄️ **Database Schema**

### **Table:** `withdrawal_requests`

```sql
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  account_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_withdrawal_driver` on `(driver_id, created_at DESC)`
- `idx_withdrawal_status` on `(status)` WHERE status = 'pending'
- `idx_withdrawal_status_date` on `(status, created_at DESC)`

---

## 🛣️ **Routes & Navigation**

### **Backend Routes** (`paymentRoutes.ts`)
```typescript
POST /payment/withdraw/request  // Driver requests withdrawal
POST /payment/withdraw/manage   // Admin approves/rejects
```

### **Dashboard Routes** (`App.tsx`)
```typescript
/withdrawal-requests  // Admin withdrawal management page
```

### **Sidebar Navigation**
Added "Withdrawal Requests" menu item with DollarSign icon

---

## 🔐 **Security & Validation**

### **Authentication:**
- ✅ Driver endpoints require `authenticate` + `requireDriver` middleware
- ✅ Admin endpoints require `authenticate` + `requireAdmin` middleware

### **Validation Schemas:**

**withdrawRequestSchema:**
```typescript
{
  amount: number (positive, max 100,000),
  method: string (required),
  accountNumber: string (required, max 100)
}
```

**withdrawManageSchema:**
```typescript
{
  requestId: UUID,
  action: 'approve' | 'reject',
  adminNote: string (optional, max 500)
}
```

---

## 📊 **Workflow**

### **Driver Workflow:**
1. Driver opens Wallet screen from sidebar
2. Views current balance
3. Clicks "Request Withdrawal"
4. Enters amount, selects method, enters account number
5. Submits request
6. Request appears in history with "Pending" status
7. Receives notification when approved/rejected

### **Admin Workflow:**
1. Admin opens "Withdrawal Requests" from sidebar
2. Views pending requests
3. Clicks "Review" on a request
4. Reviews driver info and request details
5. Adds optional note
6. Clicks "Approve" or "Reject"
7. System processes the request:
   - **Approve:** Deducts from wallet, creates transaction
   - **Reject:** Updates status only
8. Driver sees updated status in app

---

## ✅ **Testing Checklist**

### **Driver App:**
- [ ] Open Wallet screen
- [ ] Verify balance displays correctly
- [ ] Click "Request Withdrawal"
- [ ] Enter amount (test with amount > balance)
- [ ] Select payment method
- [ ] Enter account number
- [ ] Submit request
- [ ] Verify request appears in history
- [ ] Check status updates after admin action

### **Admin Dashboard:**
- [ ] Navigate to "Withdrawal Requests"
- [ ] Verify pending requests display
- [ ] Click "Review" on a request
- [ ] Verify driver information shows correctly
- [ ] Test "Approve" action
- [ ] Test "Reject" action (with and without note)
- [ ] Verify request moves to processed section
- [ ] Check wallet balance updated correctly

### **Backend:**
- [ ] Test withdrawal request with insufficient balance
- [ ] Test withdrawal request with valid data
- [ ] Test approve action
- [ ] Test reject action without note (should fail)
- [ ] Verify wallet transaction created on approval
- [ ] Check database records

---

## 🚀 **Deployment Notes**

1. **Database Migration:** Ensure `withdrawal_requests` table exists
2. **RLS Policies:** Verify Row Level Security policies are enabled
3. **Environment Variables:** No new variables required
4. **Frontend Build:** Dashboard needs rebuild for new route
5. **Mobile App:** Rebuild app for wallet screen updates

---

## 📝 **Future Enhancements**

- [ ] Add withdrawal limits (daily/weekly)
- [ ] Add withdrawal fees
- [ ] Email notifications for drivers
- [ ] Bulk approval for admins
- [ ] Export withdrawal reports
- [ ] Add withdrawal history filters
- [ ] Integration with payment gateways for auto-transfer

---

## ✅ **Status: COMPLETE**

All components are implemented and ready for testing!

**Files Modified:**
- ✅ `smartline-app/src/components/DriverSideMenu.tsx` - Added Wallet menu
- ✅ `smartline-backend/src/controllers/paymentController.ts` - Fixed driverId handling
- ✅ `smartline-backend/src/validators/schemas.ts` - Updated validation
- ✅ `smartline-command-center/src/pages/WithdrawalRequests.tsx` - New page
- ✅ `smartline-command-center/src/App.tsx` - Added route
- ✅ `smartline-command-center/src/components/layout/Sidebar.tsx` - Added menu item
