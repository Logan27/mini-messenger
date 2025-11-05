# Group Message Receipts Implementation

**Implementation Date**: November 5, 2025
**Author**: AI Assistant
**Status**: Backend Complete, Frontend Partial
**Related Tasks**: Section 2.2 (Message Status Indicators) and 3.2 (Group Chat View)

---

## Overview

This implementation adds support for per-user delivery and read receipts in group messages, along with a privacy setting to control whether read receipts are sent.

## Features Implemented

### Backend

#### 1. Database Schema Changes

**File**: `backend/docker/postgres/add-read-receipts-privacy-setting.sql`
- Added `readReceiptsEnabled` column to `users` table (BOOLEAN, default TRUE)
- Added index for performance
- Backward compatible - defaults to enabled for existing users

**Existing Table**: `groupMessageStatus`
- Already existed in codebase
- Tracks delivery and read status per user for group messages
- Fields: `messageId`, `userId`, `status` (sent/delivered/read), `deliveredAt`, `readAt`

#### 2. User Model Updates

**File**: `backend/src/models/User.js`
- Added `readReceiptsEnabled` field with default value `true`
- Added index `idx_users_read_receipts_enabled`
- Includes validation and comments

#### 3. Message Sending Logic

**File**: `backend/src/routes/messages.js`

**Changes**:
- Import `GroupMessageStatus` model
- When creating group messages, automatically create `GroupMessageStatus` entries for each group member (except sender)
- Initial status set to 'delivered' when message is sent
- Uses transaction for atomicity

**Code Location**: Lines 210-235

#### 4. Read Receipt Tracking

**File**: `backend/src/services/messageService.js`

**Changes**:
- Updated `updateMessageReadStatus()` method to handle group messages separately (lines 595-627)
- For group messages: Updates `GroupMessageStatus` table instead of `Message.status`
- For 1-to-1 messages: Continues using `Message.status` field
- Idempotent - won't create duplicate receipts
- Respects privacy setting

#### 5. API Endpoints

**A. Get Group Message Receipts**

```
GET /api/messages/:id/receipts
```

**File**: `backend/src/routes/messages.js` (lines 1918-2089)

**Response**:
```json
{
  "success": true,
  "data": {
    "messageId": "uuid",
    "groupId": "uuid",
    "totalMembers": 5,
    "deliveredCount": 5,
    "readCount": 3,
    "receipts": [
      {
        "userId": "uuid",
        "username": "john_doe",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "/path/to/avatar.jpg",
        "status": "read",
        "deliveredAt": "2025-11-05T10:00:00Z",
        "readAt": "2025-11-05T10:05:00Z",
        "readReceiptsEnabled": true
      }
    ]
  }
}
```

**Features**:
- Privacy-aware: Hides read status if user has disabled read receipts
- Shows "delivered" instead of "read" for users with privacy enabled
- Validates group membership before returning data
- Only works for group messages

**B. Update Read Receipts Privacy Setting**

```
PUT /api/users/me/privacy/read-receipts
```

**File**: `backend/src/routes/users.js` (lines 1608-1692)

**Request**:
```json
{
  "enabled": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Read receipts setting updated successfully",
  "data": {
    "readReceiptsEnabled": true
  }
}
```

### Frontend

#### 1. GroupMessageReceipts Component

**File**: `frontend.backup/src/features/messaging/components/GroupMessageReceipts.tsx`

**Components**:

**A. GroupMessageReceipts (Modal)**
- Full-screen modal showing detailed receipt information
- Displays statistics: Delivered count and Read count
- Lists all group members with their read status
- Shows avatars, names, and timestamps
- Respects privacy settings - shows "Read receipts disabled" for users with privacy enabled
- Real-time data fetching from API

**B. GroupMessageStatusIndicator (Inline)**
- Compact status indicator for message bubbles
- Shows checkmarks (single/double) with counts
- Clickable - opens full receipts modal
- Changes color when all members have read (blue checkmarks)
- Shows "X read / Y delivered" format

#### 2. MessageBubble Updates

**File**: `frontend.backup/src/components/messaging/MessageBubble.tsx`

**Changes**:
- Added `groupReceiptStats` prop for group message statistics
- Added state for receipts modal visibility
- For group messages sent by user: Shows GroupMessageStatusIndicator instead of regular StatusIcon
- Clicking status opens GroupMessageReceipts modal
- Backward compatible - still shows regular status for 1-to-1 messages

---

## Implementation Status

### ✅ Completed (Backend)

1. ✅ User model with `readReceiptsEnabled` field
2. ✅ Database migration SQL file
3. ✅ GroupMessageStatus entries created on message send
4. ✅ Read receipt tracking for group messages
5. ✅ API endpoint to get group message receipts (with privacy)
6. ✅ API endpoint to update read receipts privacy setting
7. ✅ Privacy-aware receipt responses
8. ✅ WebSocket events already handled by existing messageService

### ✅ Completed (Frontend - Components)

1. ✅ GroupMessageReceipts modal component
2. ✅ GroupMessageStatusIndicator component
3. ✅ MessageBubble integration

### ⏳ Pending (Frontend - Integration)

1. ⏳ Privacy settings UI in Profile/Settings page
2. ⏳ Group chat view integration (fetching receipt stats)
3. ⏳ Real-time receipt updates via WebSocket
4. ⏳ Read receipts settings toggle component

---

## Setup Instructions

### Database Migration

Run the following SQL migration:

```bash
cd backend
# If using Docker:
docker-compose exec postgres psql -U postgres -d messenger -f /docker-entrypoint-initdb.d/add-read-receipts-privacy-setting.sql

# Or directly:
psql -U postgres -d messenger -f docker/postgres/add-read-receipts-privacy-setting.sql
```

### Verify Migration

```sql
-- Check if column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'readReceiptsEnabled';

-- Check existing data
SELECT id, username, "readReceiptsEnabled" FROM users LIMIT 5;
```

### Frontend Setup

Since frontend is in `frontend.backup/`, you'll need to:

1. Copy the GroupMessageReceipts component to the active frontend:
   ```bash
   mkdir -p frontend/src/features/messaging/components
   cp frontend.backup/src/features/messaging/components/GroupMessageReceipts.tsx \
      frontend/src/features/messaging/components/
   ```

2. Copy the updated MessageBubble:
   ```bash
   cp frontend.backup/src/components/messaging/MessageBubble.tsx \
      frontend/src/components/messaging/
   ```

---

## Usage

### For Developers - Fetching Group Receipts

```typescript
// In your group chat component
const fetchGroupReceipts = async (messageId: string) => {
  try {
    const response = await apiClient.get(`/api/messages/${messageId}/receipts`);
    const { totalMembers, deliveredCount, readCount, receipts } = response.data.data;

    // Update UI with receipt stats
    setReceiptStats({ deliveredCount, readCount, totalMembers });
  } catch (error) {
    console.error('Failed to fetch receipts:', error);
  }
};
```

### For Developers - Privacy Setting

```typescript
// Update read receipts setting
const updateReadReceiptsSetting = async (enabled: boolean) => {
  try {
    await apiClient.put('/api/users/me/privacy/read-receipts', { enabled });
    toast.success(`Read receipts ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    toast.error('Failed to update setting');
  }
};
```

### For Users

**Enabling/Disabling Read Receipts**:
1. Go to Profile/Settings
2. Navigate to Privacy section
3. Toggle "Send Read Receipts"
4. Changes apply immediately

**Viewing Group Message Receipts**:
1. In a group chat, find your sent messages
2. Click on the status indicator (checkmarks with count)
3. View who has received and read your message
4. Users with privacy enabled will only show "Delivered"

---

## Technical Notes

### Privacy Considerations

- Users can disable read receipts to maintain privacy
- When disabled, they still receive delivery confirmation but don't send read receipts
- The system respects this at API level - filtering out read status in responses
- Other users will see "Delivered" instead of "Read" for privacy-enabled users

### Performance

- GroupMessageStatus entries are created in bulk using `bulkCreate()`
- Indexes added for fast queries on messageId and userId
- API endpoint uses `include` for efficient joins
- Frontend modal fetches data only when opened (lazy loading)

### WebSocket Events

The existing WebSocket infrastructure already handles:
- `message.read` event when a user marks message as read
- `message.delivered` event when message is received
- Group-specific room broadcasting

No additional WebSocket changes needed - the messageService already emits appropriate events.

### Database Schema

```sql
-- Users table (updated)
ALTER TABLE users
ADD COLUMN "readReceiptsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- GroupMessageStatus table (already exists)
CREATE TABLE "groupMessageStatus" (
  "id" UUID PRIMARY KEY,
  "messageId" UUID NOT NULL REFERENCES messages(id),
  "userId" UUID NOT NULL REFERENCES users(id),
  "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "readAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE,
  "updatedAt" TIMESTAMP WITH TIME ZONE,
  UNIQUE ("messageId", "userId")
);
```

---

## Testing

### Manual Testing Steps

1. **Test Group Message Receipts**:
   ```bash
   # Send a group message
   curl -X POST http://localhost:3001/api/messages \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"groupId": "GROUP_ID", "content": "Test message"}'

   # Get receipts
   curl -X GET http://localhost:3001/api/messages/MESSAGE_ID/receipts \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Test Privacy Setting**:
   ```bash
   # Disable read receipts
   curl -X PUT http://localhost:3001/api/users/me/privacy/read-receipts \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"enabled": false}'

   # Verify setting
   curl -X GET http://localhost:3001/api/users/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Test Read Receipt Privacy**:
   - User A disables read receipts
   - User B sends group message
   - User A reads the message
   - User B fetches receipts - should see User A as "delivered" not "read"

---

## Future Enhancements

1. **Read Receipt Settings per Group**
   - Allow users to disable read receipts for specific groups
   - API: `/api/groups/:id/settings/read-receipts`

2. **Batch Receipt Fetching**
   - Fetch receipts for multiple messages in one request
   - API: `POST /api/messages/receipts/batch`

3. **Read Receipt Notifications**
   - Push notification when someone reads your message
   - Configurable in notification settings

4. **Analytics Dashboard**
   - Show read receipt statistics over time
   - Engagement metrics per group

---

## Related Files

### Backend
- `backend/src/models/User.js` - User model with privacy field
- `backend/src/models/GroupMessageStatus.js` - Receipt tracking model (existing)
- `backend/src/routes/messages.js` - Message routes with receipts endpoint
- `backend/src/routes/users.js` - User routes with privacy endpoint
- `backend/src/services/messageService.js` - Message service with read tracking
- `backend/docker/postgres/add-read-receipts-privacy-setting.sql` - Migration

### Frontend
- `frontend.backup/src/features/messaging/components/GroupMessageReceipts.tsx` - Receipts UI
- `frontend.backup/src/components/messaging/MessageBubble.tsx` - Message bubble with receipts

---

## API Documentation

Full Swagger/OpenAPI documentation available at:
- `http://localhost:3001/api-docs` (when backend is running)

Endpoints added:
- `GET /api/messages/{id}/receipts` - Get group message receipts
- `PUT /api/users/me/privacy/read-receipts` - Update read receipts privacy setting

---

## Changelog

### November 5, 2025
- ✅ Implemented backend group message receipt tracking
- ✅ Added privacy setting for read receipts
- ✅ Created API endpoints for receipts and privacy
- ✅ Built frontend components for receipt display
- ✅ Integrated with MessageBubble component
- ⏳ Pending: Privacy settings UI integration
- ⏳ Pending: Database migration execution
- ⏳ Pending: Full frontend integration and testing

---

## Support

For issues or questions:
1. Check the implementation files listed above
2. Review the API documentation at `/api-docs`
3. Test with the provided cURL commands
4. Verify database migration was applied successfully
