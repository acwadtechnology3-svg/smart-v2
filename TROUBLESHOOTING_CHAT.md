# 🚨 Troubleshooting Chat Issues

## 1. "Violates foreign key constraint" (Error 23503)
If you see: `Key (sender_id)=(...) is not present in table "users"`.
**Cause:** You are testing with a User ID that doesn't actually exist in the Auth system (deleted user or fake data).
**Fix:** Run this SQL to allow "fake" users to chat:
```sql
alter table messages drop constraint messages_sender_id_fkey;
```

## 2. "Missing userId" Error
If your logs show `userId: null`, it means the app lost track of who you are.
**Fix:** 
1. **Restart the app** completely.
2. If that fails, **Log Out** and **Log In** again.

## 3. "Violates row-level security policy"
If you see this error, run this SQL:
```sql
alter table messages disable row level security;
```
