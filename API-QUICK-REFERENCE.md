# Messenger API - Quick Reference Guide

## 🚀 Quick Start

### Base URL
```
http://localhost:4000
```

### Swagger Documentation
```
http://localhost:4000/api-docs
```

---

## 🔐 Authentication Flow

### 1. Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful. Awaiting admin approval.",
  "data": {
    "userId": "uuid",
    "status": "pending"
  }
}
```

### 2. Admin Approval (Admin Only)
```http
POST /api/admin/users/{userId}/approve
Authorization: Bearer <admin-token>
```

### 3. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "johndoe",
  "password": "SecureP@ss123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

### 4. Use Token in Requests
```http
Authorization: Bearer eyJhbGci...
```

---

## 💬 Common Operations

### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "recipient-uuid",
  "content": "Hello, world!",
  "messageType": "text"
}
```

### Get Messages
```http
GET /api/messages?page=1&limit=50
Authorization: Bearer <token>
```

### Create Group
```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Team Chat",
  "description": "Our team discussion group",
  "members": ["user-uuid-1", "user-uuid-2"]
}
```

### Upload File
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary-data>
```

### Send Contact Request
```http
POST /api/contacts/{userId}
Authorization: Bearer <token>
```

### Initiate Call
```http
POST /api/calls
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "user-uuid",
  "callType": "video"
}
```

---

## 📊 Query Parameters

### Pagination
```
?page=1&limit=20
```

### Filtering Messages
```
?recipientId=uuid&messageType=text&page=1
```

### Search Users
```
?search=john&limit=10
```

### Sort Options
```
?sortBy=createdAt&sortOrder=desc
```

---

## 🎯 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 🚦 Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Login | 5 requests | 15 minutes |
| API Calls | 100 requests | 15 minutes |
| File Uploads | 10 requests | 1 hour |

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## 📁 File Upload Constraints

- **Max Size**: 10 MB per file
- **Rate Limit**: 10 uploads per hour
- **Virus Scanning**: ClamAV (automatic)
- **Thumbnails**: Auto-generated for images

### Allowed MIME Types
```
image/jpeg, image/png, image/gif, image/webp
application/pdf
text/plain
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

---

## 🔌 WebSocket Connection

### Connect
```javascript
const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events to Listen
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data);
});

socket.on('message:read', (data) => {
  console.log('Message read:', data);
});

socket.on('user:online', (data) => {
  console.log('User online:', data);
});

socket.on('call:incoming', (data) => {
  console.log('Incoming call:', data);
});
```

### Events to Emit
```javascript
socket.emit('message:send', {
  recipientId: 'uuid',
  content: 'Hello!'
});

socket.emit('message:typing', {
  recipientId: 'uuid'
});
```

---

## 🎥 Video Call Flow (P2P WebRTC)

### 1. Initiate Call
```http
POST /api/calls
{
  "recipientId": "uuid",
  "callType": "video"
}
```

### 2. Signal Offer (via WebSocket)
```javascript
socket.emit('call:offer', {
  callId: 'uuid',
  offer: sdpOffer
});
```

### 3. Receive Answer
```javascript
socket.on('call:answer', (data) => {
  peerConnection.setRemoteDescription(data.answer);
});
```

### 4. Exchange ICE Candidates
```javascript
socket.emit('call:ice-candidate', {
  callId: 'uuid',
  candidate: iceCandidate
});

socket.on('call:ice-candidate', (data) => {
  peerConnection.addIceCandidate(data.candidate);
});
```

### 5. End Call
```http
POST /api/calls/{callId}/end
```

---

## 🛡️ Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### Username Requirements
- 3-50 characters
- Alphanumeric only (no special characters)
- Must be unique

### Message Encryption
- End-to-end encryption using **libsodium**
- Client-side encryption before sending
- Server stores encrypted content only
- Keys exchanged via `/api/encryption/exchange-keys`

---

## 📝 Common HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## 🔍 Search & Filter Examples

### Search Users
```http
GET /api/users/search?q=john&limit=10
```

### Filter Messages by Type
```http
GET /api/messages?messageType=image&page=1
```

### Get Unread Messages
```http
GET /api/messages?isRead=false
```

### Get Group Members
```http
GET /api/groups/{groupId}/members
```

---

## 👥 Group Management

### Create Group
```http
POST /api/groups
{
  "name": "Project Team",
  "description": "Main project discussion",
  "members": ["uuid1", "uuid2", "uuid3"]
}
```

### Add Member
```http
POST /api/groups/{groupId}/members
{
  "userId": "new-member-uuid"
}
```

### Remove Member
```http
DELETE /api/groups/{groupId}/members/{userId}
```

### Update Group
```http
PUT /api/groups/{groupId}
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

---

## 🔔 Notification Management

### Get Notifications
```http
GET /api/notifications?page=1&limit=20
```

### Mark as Read
```http
PUT /api/notifications/{notificationId}/read
```

### Get Unread Count
```http
GET /api/notifications/unread-count
```

### Update Preferences
```http
PUT /api/notifications/settings
{
  "messageNotifications": true,
  "callNotifications": true,
  "groupNotifications": false
}
```

---

## 🎛️ Admin Endpoints (Requires Admin Role)

### Approve User
```http
POST /api/admin/users/{userId}/approve
```

### Suspend User
```http
POST /api/admin/users/{userId}/suspend
{
  "reason": "Violation of terms"
}
```

### Get System Stats
```http
GET /api/admin/stats
```

### View Audit Logs
```http
GET /api/admin/audit-logs?page=1&limit=50
```

### Create Announcement
```http
POST /api/admin/announcements
{
  "title": "System Maintenance",
  "content": "Scheduled maintenance tonight",
  "priority": "high"
}
```

---

## 🏥 Health Check

### Simple Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T21:39:53.962Z",
  "uptime": 3600,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "websocket": "healthy"
  }
}
```

### Prometheus Metrics
```http
GET /metrics
```

---

## 📚 Additional Resources

- **Full API Documentation**: http://localhost:4000/api-docs
- **Interactive Testing**: Available in Swagger UI
- **Schema Definitions**: See Swagger UI "Schemas" section
- **Example Requests**: Use "Try it out" in Swagger UI

---

## 💡 Tips & Best Practices

### 1. Token Management
- Store tokens securely (e.g., httpOnly cookies)
- Refresh tokens before expiry
- Use refresh endpoint for long sessions

### 2. Error Handling
- Always check `success` field in responses
- Handle rate limiting gracefully
- Display user-friendly error messages

### 3. Pagination
- Use reasonable page sizes (10-50 items)
- Cache pagination results when appropriate
- Show loading states during pagination

### 4. File Uploads
- Check file size before uploading
- Show upload progress
- Handle virus scan results
- Display thumbnails when available

### 5. Real-time Features
- Maintain WebSocket connection
- Implement reconnection logic
- Handle connection errors gracefully
- Use WebSocket for instant updates

### 6. Performance
- Use pagination for large lists
- Implement virtual scrolling for messages
- Cache user profiles locally
- Debounce search queries

---

**Last Updated**: October 23, 2025  
**API Version**: 1.0.0  
**Backend Port**: 4000
