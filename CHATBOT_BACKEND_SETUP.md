# AI Chatbot Backend Integration - Setup Instructions

## Step 1: Run Database Migration

Execute the SQL migration to create the chat tables in Supabase:

```bash
# Open Supabase SQL Editor
# Go to: https://supabase.com/dashboard/project/sxadrmfixlzsettqjntf/sql

# Copy and paste the contents of CREATE_CHAT_TABLES.sql
# Then click "Run"
```

The migration file is located at: `c:\Users\Ezzat\Desktop\smartline\CREATE_CHAT_TABLES.sql`

This will create:
- `chat_conversations` table - Stores conversation sessions
- `chat_messages` table - Stores individual messages
- Proper indexes for performance
- Row Level Security (RLS) policies
- Triggers for timestamp updates

## Step 2: Restart Backend Server

The backend routes are already registered. Just restart your backend:

```bash
# Press Ctrl+C in the backend terminal
# Then run:
npm run dev
```

## Step 3: Test Backend API

The following endpoints are now available:

### Start New Conversation
```http
POST /api/chatbot/start
Authorization: Bearer <token>

Response:
{
  "success": true,
  "conversation": { ... },
  "message": { ... }
}
```

### Send Message
```http
POST /api/chatbot/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "uuid",
  "action": "current_location",
  "data": {
    "address": "123 Main St",
    "lat": 30.0444,
    "lng": 31.2357
  }
}
```

### Get Conversation History
```http
GET /api/chatbot/:conversationId/messages
Authorization: Bearer <token>
```

### Get Active Conversation
```http
GET /api/chatbot/active
Authorization: Bearer <token>
```

## Step 4: Update Frontend (Optional)

The current frontend chatbot works locally. To use the backend API instead:

1. Update `src/services/chatBotService.ts` to call backend APIs
2. Store conversation ID in state
3. Send messages to backend instead of processing locally

## Benefits of Backend Integration

✅ **Persistent History** - Conversations saved in database
✅ **Multi-Device** - Continue conversations across devices
✅ **Analytics** - Track conversation patterns and success rates
✅ **Scalability** - Can add AI/ML processing later
✅ **Security** - User data protected with RLS policies

## Current Status

- ✅ Database tables created (run SQL migration)
- ✅ Backend API routes implemented
- ✅ Authentication middleware applied
- ✅ Routes registered in Express app
- ⏳ Frontend still using local service (works fine)
- ⏳ Location permissions added to app.json

## Next Steps

1. **Run the SQL migration** in Supabase
2. **Restart backend** server
3. **Test the chatbot** in the app
4. **Optionally** migrate frontend to use backend API

## Troubleshooting

### Location Not Working
- Make sure location permissions are granted in device settings
- For Android: Rebuild the app after app.json changes
- For iOS: Check Info.plist has location usage descriptions

### Backend Errors
- Check Supabase connection in backend logs
- Verify JWT token is being sent from frontend
- Ensure chat tables exist in database

### Chatbot Not Responding
- Check browser/app console for errors
- Verify backend is running on port 3000
- Test backend health endpoint: http://localhost:3000/health

---

**Implementation Date**: February 5, 2026
**Status**: Backend Ready, Frontend Working Locally
