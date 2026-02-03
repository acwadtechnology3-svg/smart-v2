# SmartLine Dashboard Authentication

This document explains the dashboard authentication system that connects the SmartLine Command Center frontend with the backend API.

## Overview

The dashboard authentication system provides:
- **Role-based access control** with 4 roles: `super_admin`, `admin`, `manager`, `viewer`
- **Fine-grained permissions** per page (view, create, edit, delete)
- **Super admin member management** - add/edit/delete dashboard users
- **JWT-based authentication** with 24h expiration
- **Protected routes** that require authentication and permissions

## Backend Setup

### 1. Database Migration

Run the migration to create the dashboard auth tables:

```bash
cd smartline-backend
npm run migrate
```

Or manually run the SQL file:
```bash
psql -d your_database -f src/db/migrations/007_dashboard_auth.sql
```

### 2. Environment Variables

Make sure your `.env` file has:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Initialize First Super Admin

When no users exist, you can create the first super admin:

```bash
curl -X POST http://localhost:3000/api/dashboard/auth/init \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartline.com",
    "password": "SecurePassword123!",
    "full_name": "Super Admin"
  }'
```

**Note**: This endpoint only works when no dashboard users exist.

### 4. API Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/dashboard/auth/init` | POST | No | Create first super admin |
| `/api/dashboard/auth/login` | POST | No | Login and get JWT token |
| `/api/dashboard/auth/me` | GET | Yes | Get current user profile |
| `/api/dashboard/auth/users` | GET | Yes (admin+) | List all users |
| `/api/dashboard/auth/register` | POST | Yes (super_admin) | Create new user |
| `/api/dashboard/auth/users/:id` | PATCH | Yes (super_admin) | Update user |
| `/api/dashboard/auth/users/:id` | DELETE | Yes (super_admin) | Delete user |
| `/api/dashboard/auth/users/:id/reset-password` | POST | Yes (super_admin) | Reset password |
| `/api/dashboard/auth/change-password` | POST | Yes | Change own password |
| `/api/dashboard/auth/permissions/:role` | GET | Yes (super_admin) | Get role permissions |
| `/api/dashboard/auth/permissions/:role` | PUT | Yes (super_admin) | Update role permissions |

## Frontend Setup

### 1. Environment Variables

Add to your `.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 2. Login

Navigate to `/login` and sign in with email/password.

### 3. Available Pages

After login, users can only see pages they have `can_view` permission for:

| Page | super_admin | admin | manager | viewer |
|------|-------------|-------|---------|--------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Drivers | ✓ | ✓ | ✓ | ✓ |
| Driver Requests | ✓ | ✓ | ✓ | ✓ |
| Trips | ✓ | ✓ | ✓ | ✓ |
| Customers | ✓ | ✓ | ✓ | ✓ |
| Wallet | ✓ | ✓ | ✓ | ✓ |
| Withdrawal Requests | ✓ | ✓ | ✓ | ✓ |
| Promos | ✓ | ✓ | ✓ | ✓ |
| Safety | ✓ | ✓ | ✓ | ✓ |
| Support | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | view only | ✗ |
| Team Members | ✓ | ✗ | ✗ | ✗ |

## Roles Explained

### Super Admin
- Full access to everything
- Can create/manage/delete all users
- Can manage role permissions
- Can reset passwords

### Admin
- Full access except member management
- Can edit settings but not delete them

### Manager
- Can view and edit most things
- Limited create/delete permissions
- Cannot access member management

### Viewer
- View-only access to most pages
- No settings access
- Cannot make any changes

## Security Notes

1. **Password Requirements**: Minimum 8 characters
2. **Token Expiration**: 24 hours
3. **Inactive Users**: Accounts can be disabled by setting `is_active = false`
4. **Self-Protection**: Users cannot delete their own account
5. **Permission Caching**: Frontend caches permissions in localStorage; changes require re-login

## Creating Users via API

```bash
# Login first to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/dashboard/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartline.com","password":"yourpassword"}' \
  | jq -r '.data.token')

# Create a new manager
curl -X POST http://localhost:3000/api/dashboard/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "manager@smartline.com",
    "password": "TempPass123!",
    "full_name": "John Manager",
    "role": "manager"
  }'
```

## Troubleshooting

### Login fails with "Invalid credentials"
- Check email is lowercase
- Verify password is correct
- Check if user `is_active = true`

### "Authentication required" error
- Token may be expired - re-login
- Check `Authorization: Bearer <token>` header is sent

### Can't access a page
- Check user's role permissions in database
- Verify `dashboard_permissions` table has entries for the role
- Super admin bypasses all permission checks

### Sidebar not showing members link
- Only visible to `super_admin` role
- Check user's role in the database

## Files Created/Modified

### Backend
- `src/db/migrations/007_dashboard_auth.sql` - Database schema
- `src/db/schema.sql` - Added dashboard tables
- `src/controllers/dashboardAuthController.ts` - Auth logic
- `src/routes/dashboardAuthRoutes.ts` - API routes
- `src/middleware/rbac.ts` - Updated role types
- `src/middleware/auth.ts` - Updated user type
- `src/validators/schemas.ts` - Added dashboard auth schemas
- `src/index.ts` - Added dashboard routes

### Frontend
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/auth/ProtectedRoute.tsx` - Route protection
- `src/pages/Login.tsx` - Login page
- `src/pages/Members.tsx` - Member management (super admin only)
- `src/components/layout/Sidebar.tsx` - Added auth integration
- `src/components/layout/TopBar.tsx` - Added user info
- `src/App.tsx` - Added protected routes
- `.env` - Added VITE_API_URL
