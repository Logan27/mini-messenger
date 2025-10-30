# Notification System Integration Guide

## Overview

The notification system has been successfully implemented with the following components:

- ✅ Database model with proper schema, validation, and indexes
- ✅ Database migration for notifications table
- ✅ REST API controller with all required endpoints
- ✅ Routes and middleware integration
- ✅ WebSocket integration for real-time notifications
- ✅ Business logic service with auto-expiry and rate limiting
- ✅ Comprehensive unit and integration tests
- ✅ Frontend React hooks for easy integration

## Database Schema

### Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type ENUM('message', 'call', 'mention', 'admin', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' NOT NULL,
  category ENUM('message', 'call', 'mention', 'admin', 'system') NOT NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NULL
);
```

### Indexes Created

- `idx_notifications_user_id` - Fast user lookup
- `idx_notifications_user_read` - Filter by user and read status
- `idx_notifications_user_created` - Sort by user and creation time
- `idx_notifications_type` - Filter by notification type
- `idx_notifications_priority` - Sort by priority
- `idx_notifications_category` - Filter by category
- `idx_notifications_read_created` - Combined read status and date sorting
- `idx_notifications_expires_at` - Efficient expiry cleanup
- `idx_notifications_id_unique` - Ensure ID uniqueness

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List user notifications with pagination and filtering |
| GET | `/api/notifications/unread-count` | Get unread notification count for badge |
| PUT | `/api/notifications/:id/read` | Mark single notification as read |
| PUT | `/api/notifications/mark-all-read` | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Delete single notification |

### Administrative Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/notifications` | Create notification | Authenticated users |
| POST | `/api/notifications/cleanup` | Clean expired notifications | Admin only |

## WebSocket Events

### Real-time Events

The system emits the following WebSocket events for real-time updates:

```javascript
// New notification received
socket.on('notification:new', (data) => {
  console.log('New notification:', data.notification);
});

// Notification marked as read
socket.on('notification:read', (data) => {
  console.log('Notification read:', data.notificationId);
});

// Notification deleted
socket.on('notification:deleted', (data) => {
  console.log('Notification deleted:', data.notificationId);
});

// Badge count updated
socket.on('notification:badge-update', (data) => {
  console.log('Unread count:', data.unreadCount);
});
```

## Frontend Integration

### React Hooks

The system provides three main hooks for easy integration:

#### `useNotifications`

Main hook for managing user notifications:

```typescript
import { useNotifications } from '../hooks/useNotifications';

function NotificationComponent() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    setFilters,
    clearError,
  } = useNotifications({
    limit: 20,
    read: false, // Only unread
    type: 'message' // Only message notifications
  });

  // Component logic here
}
```

#### `useCreateNotification`

Hook for creating notifications (admin/internal use):

```typescript
import { useCreateNotification } from '../hooks/useNotifications';

function AdminComponent() {
  const { createNotification, isLoading, error } = useCreateNotification();

  const handleCreateNotification = async () => {
    try {
      await createNotification({
        userId: 'user-id',
        type: 'system',
        title: 'System Update',
        content: 'System maintenance scheduled',
        category: 'system',
        priority: 'high',
        data: { maintenanceId: 'maint-123' }
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };
}
```

#### `useNotificationCleanup`

Hook for cleaning up expired notifications (admin only):

```typescript
import { useNotificationCleanup } from '../hooks/useNotifications';

function AdminPanel() {
  const { cleanupExpired, isLoading } = useNotificationCleanup();

  const handleCleanup = async () => {
    try {
      const deletedCount = await cleanupExpired();
      console.log(`Cleaned up ${deletedCount} expired notifications`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };
}
```

## Usage Examples

### Creating Notifications

#### From Backend Services

```javascript
import notificationService from '../services/notificationService.js';

// Create a simple notification
await notificationService.createNotification({
  userId: 'user-id',
  type: 'message',
  title: 'New Message',
  content: 'You have received a new message',
  category: 'message',
  priority: 'medium'
}, 'user-id');

// Create with additional data
await notificationService.createNotification({
  userId: 'user-id',
  type: 'call',
  title: 'Missed Call',
  content: 'You missed a call from John',
  category: 'call',
  priority: 'high',
  data: {
    callId: 'call-123',
    callerName: 'John Doe',
    duration: 30
  }
}, 'user-id');
```

#### From API (Admin)

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "target-user-id",
    "type": "system",
    "title": "System Maintenance",
    "content": "Scheduled maintenance tonight",
    "category": "system",
    "priority": "urgent",
    "data": {
      "maintenanceWindow": "02:00-04:00",
      "affectedServices": ["messaging", "calls"]
    }
  }'
```

### Querying Notifications

#### Get All Notifications

```bash
curl -X GET "http://localhost:3000/api/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Unread Notifications with Pagination

```bash
curl -X GET "http://localhost:3000/api/notifications?read=false&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Filter by Type

```bash
curl -X GET "http://localhost:3000/api/notifications?type=message&priority=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Unread Count

```bash
curl -X GET "http://localhost:3000/api/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Managing Notifications

#### Mark as Read

```bash
curl -X PUT "http://localhost:3000/api/notifications/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Mark All as Read

```bash
curl -X PUT "http://localhost:3000/api/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Mark Only Message Notifications as Read

```bash
curl -X PUT "http://localhost:3000/api/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "message"}'
```

#### Delete Notification

```bash
curl -X DELETE "http://localhost:3000/api/notifications/NOTIFICATION_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Business Logic

### Auto-Expiry

- Notifications automatically expire after 30 days (matches message retention policy)
- Expired notifications are automatically cleaned up every hour
- Manual cleanup available via admin endpoint

### Rate Limiting

The system implements multi-tier rate limiting:

#### Creation Limits (per user):
- 50 notifications per minute
- 500 notifications per hour
- 2000 notifications per day

#### Action Limits (per user):
- 100 actions per minute (mark as read, delete, etc.)
- 1000 actions per hour

### Priority-based Sorting

Notifications are sorted by priority (DESC) then by creation time (DESC):
1. `urgent` - Critical system notifications
2. `high` - Important notifications (calls, mentions)
3. `medium` - Standard notifications (default)
4. `low` - Informational notifications

## Security Considerations

### Authentication & Authorization

- All endpoints require valid JWT token
- Users can only access their own notifications
- Admin role required for cleanup operations
- Input validation on all endpoints

### Rate Limiting

- Prevents notification spam
- Protects against abuse
- Configurable limits per time window
- Automatic cleanup of old rate limit data

### Data Validation

- Comprehensive input validation using express-validator
- UUID validation for IDs
- Enum validation for types, priorities, categories
- Length limits on text fields
- JSON validation for data field

## Performance Optimizations

### Database Indexes

- Optimized indexes for common query patterns
- Composite indexes for filtering and sorting
- Separate indexes for different access patterns

### Caching Strategy

- Rate limiting data cached in memory
- WebSocket events use Redis pub/sub for scaling
- Pagination metadata included in responses

### Auto-cleanup

- Automatic cleanup of expired notifications
- Configurable cleanup intervals
- Batch processing for large datasets

## Integration Points

### With Existing Systems

The notification system integrates with:

1. **User Management** - Links to User model for ownership
2. **Authentication** - Uses existing JWT middleware
3. **WebSocket** - Extends existing WebSocket infrastructure
4. **Rate Limiting** - Uses existing rate limiting patterns
5. **Logging** - Follows existing logging conventions

### With Frontend

1. **React Hooks** - Provides easy-to-use hooks
2. **Real-time Updates** - WebSocket integration for live updates
3. **TypeScript Support** - Full type definitions included
4. **Error Handling** - Consistent error handling patterns

## Testing

### Test Coverage

- ✅ Unit tests for Notification model
- ✅ Unit tests for NotificationController
- ✅ Unit tests for NotificationService
- ✅ Integration tests for API endpoints
- ✅ Rate limiting tests
- ✅ WebSocket integration tests
- ✅ Database operation tests

### Running Tests

```bash
# Run all notification tests
npm test notification.test.js

# Run with coverage
npm test -- --coverage notification.test.js

# Run specific test suite
npm test -- --testNamePattern="Notification Model"
```

## Deployment Considerations

### Database Migration

Run the migration to create the notifications table:

```bash
# Using Sequelize CLI
npx sequelize-cli db:migrate

# Or using the migration file directly
node backend/migrations/019-create-notifications.js
```

### Environment Variables

No additional environment variables required. The system uses existing configuration.

### Service Initialization

The notification service starts automatically with the application and begins:

- Auto-cleanup intervals
- Rate limiting data structures
- WebSocket event handlers

## Monitoring & Maintenance

### Health Checks

Monitor notification system health:

```bash
# Check if notification service is running
curl -X GET "http://localhost:3000/health"

# Get notification statistics (admin)
curl -X GET "http://localhost:3000/api/admin/stats" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Log Monitoring

Watch for these log patterns:

```javascript
// Notification creation
"Notification created: {id} for user {userId}"

// Rate limiting
"Rate limit exceeded for user {userId}"

// Auto cleanup
"Auto-cleanup: {count} expired notifications deleted"

// Errors
"Create notification service error:"
"Mark notification as read service error:"
```

### Performance Metrics

Monitor these metrics:

- Notification creation rate
- Average response time for notification endpoints
- WebSocket event delivery success rate
- Database query performance for notification queries
- Rate limiting hit rate

## Troubleshooting

### Common Issues

#### Notifications not appearing in real-time

1. Check WebSocket connection
2. Verify user authentication
3. Check Redis connectivity (for scaling)
4. Review notification service logs

#### Rate limiting too restrictive

1. Adjust limits in `notificationService.js`
2. Check current usage patterns
3. Monitor rate limiting logs
4. Consider user-specific adjustments

#### Database performance issues

1. Verify indexes are created
2. Check query patterns
3. Monitor slow queries
4. Consider read replicas for heavy loads

### Debug Mode

Enable debug logging:

```javascript
// In notificationService.js
logger.level = 'debug';

// In notificationController.js
logger.level = 'debug';
```

## Future Enhancements

### Potential Improvements

1. **Push Notifications** - Integration with FCM/APNs
2. **Notification Templates** - Predefined notification formats
3. **Bulk Operations** - Batch create/delete operations
4. **Advanced Filtering** - Date ranges, content search
5. **Notification Preferences** - User customization options
6. **Analytics** - Notification engagement metrics
7. **Email Integration** - Email notifications for important alerts

### Scaling Considerations

1. **Database Sharding** - Horizontal scaling for large user bases
2. **Redis Clustering** - For WebSocket scaling
3. **CDN Integration** - For notification assets
4. **Microservices** - Separate notification service

---

## Summary

The notification system is now fully implemented and ready for production use. It provides:

- **Reliable storage** with proper indexing and validation
- **Real-time delivery** via WebSocket integration
- **Rate limiting** to prevent abuse
- **Auto-expiry** for data retention compliance
- **Comprehensive API** for all notification operations
- **Frontend integration** with React hooks
- **Full test coverage** for reliability
- **Production-ready** with proper error handling and logging

The system follows all established patterns in the codebase and integrates seamlessly with existing infrastructure.