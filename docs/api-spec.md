REST API SPECIFICATION
Messenger Application with Video Calling
Version 1.0 - November 2024

Document Control
Document Owner: API Architect
Last Updated: November 2024
Status: Final
Related Documents: FRD v1.0, BRD v1.0, Architecture v2.0

===========================================
TABLE OF CONTENTS
===========================================

1. INTRODUCTION
2. API OVERVIEW
3. AUTHENTICATION ENDPOINTS
4. USER MANAGEMENT ENDPOINTS
5. MESSAGING ENDPOINTS
6. GROUP MANAGEMENT ENDPOINTS
7. CONTACT MANAGEMENT ENDPOINTS
8. FILE MANAGEMENT ENDPOINTS
9. CALL MANAGEMENT ENDPOINTS
10. NOTIFICATION ENDPOINTS
11. ADMIN ENDPOINTS
12. WEBSOCKET EVENTS
13. ERROR HANDLING
14. RATE LIMITING
15. SECURITY SPECIFICATIONS
16. DATA MODELS
17. EXAMPLES

===========================================
1. INTRODUCTION
===========================================

1.1 Purpose
This document provides the complete REST API specification for the Messenger application. It defines all endpoints, request/response formats, authentication mechanisms, error handling, and WebSocket events.

1.2 Base URL
Production: https://api.yourdomain.com
Staging: https://api-staging.yourdomain.com
Development: http://localhost:3000

1.3 API Versioning
Version: v1
All endpoints prefixed with: /api/v1

1.4 Content Types
Request: application/json
Response: application/json
File Upload: multipart/form-data

1.5 Authentication
Bearer Token (JWT) in Authorization header:
Authorization: Bearer <access_token>

1.6 Standard HTTP Status Codes
200 - OK
201 - Created
204 - No Content
400 - Bad Request
401 - Unauthorized
403 - Forbidden
404 - Not Found
409 - Conflict
422 - Unprocessable Entity
429 - Too Many Requests
500 - Internal Server Error
503 - Service Unavailable

===========================================
2. API OVERVIEW
===========================================

2.1 Endpoint Categories

Authentication (10 endpoints)
- Registration, login, logout, token refresh, password reset, 2FA

User Management (7 endpoints)
- Profile, settings, status, search, data export, account deletion

Messaging (6 endpoints)
- Send, edit, delete, read, search, history

Groups (7 endpoints)
- Create, update, delete, members, messages

Contacts (5 endpoints)
- Add, remove, block, unblock, list

Files (4 endpoints)
- Upload, download, thumbnail, delete

Calls (5 endpoints)
- Initiate, accept, reject, end, history

Notifications (4 endpoints)
- List, read, delete, preferences

Admin (10 endpoints)
- Users, approvals, stats, audit logs, settings

Total REST Endpoints: 58
WebSocket Events: 15

2.2 Request Headers

Required for all authenticated requests:
Authorization: Bearer <access_token>
Content-Type: application/json

Optional:
X-Device-ID: <unique_device_identifier>
X-App-Version: <application_version>
User-Agent: <client_user_agent>

2.3 Response Format

Success Response:
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-11-15T10:30:00Z",
    "requestId": "uuid-v4"
  }
}

Error Response:
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2024-11-15T10:30:00Z",
    "requestId": "uuid-v4"
  }
}

Paginated Response:
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2024-11-15T10:30:00Z",
    "requestId": "uuid-v4"
  }
}

===========================================
3. AUTHENTICATION ENDPOINTS
===========================================

3.1 Register User
POST /api/v1/auth/register

Description: Create new user account (status: pending, awaits admin approval)
FRD Reference: FR-UM-001
Authentication: None
Rate Limit: 5 requests/hour per IP

Request Body:
{
  "username": "string (3-50 chars, alphanumeric + underscore)",
  "email": "string (valid email, RFC 5322)",
  "password": "string (min 8 chars, 1 upper, 1 lower, 1 number, 1 special)",
  "confirmPassword": "string (must match password)"
}

Success Response (201 Created):
{
  "success": true,
  "data": {
    "userId": "uuid-v4",
    "username": "johndoe",
    "email": "john@example.com",
    "status": "pending",
    "createdAt": "2024-11-15T10:30:00Z",
    "message": "Registration successful. Please verify your email and wait for admin approval."
  }
}

Error Responses:
400 - Validation errors (weak password, invalid email)
409 - Email or username already exists
422 - Password mismatch

---

3.2 Verify Email
GET /api/v1/auth/verify-email?token=<verification_token>

Description: Verify user email address
FRD Reference: FR-UM-002
Authentication: None
Rate Limit: 10 requests/hour per IP

Query Parameters:
- token: string (verification token from email)

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "userId": "uuid-v4",
    "email": "john@example.com",
    "verifiedAt": "2024-11-15T10:30:00Z"
  }
}

---

3.3 Login
POST /api/v1/auth/login

Description: Authenticate user and return JWT tokens
FRD Reference: FR-UM-003
Authentication: None
Rate Limit: 5 requests/15min per IP

Request Body:
{
  "email": "string (required)",
  "password": "string (required)",
  "deviceId": "string (optional, for device tracking)",
  "deviceName": "string (optional, e.g., 'iPhone 13')"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "profilePicture": "https://cdn.example.com/avatars/user123.jpg",
      "twoFactorEnabled": false,
      "createdAt": "2024-11-15T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 86400,
      "tokenType": "Bearer"
    },
    "session": {
      "sessionId": "uuid-v4",
      "expiresAt": "2024-11-16T10:30:00Z"
    }
  }
}

2FA Required Response (200 OK):
{
  "success": true,
  "data": {
    "requiresTwoFactor": true,
    "tempToken": "temp-auth-token-for-2fa",
    "message": "Please provide 2FA code"
  }
}

Error Responses:
401 - Invalid credentials
403 - Account pending approval / Account deactivated
423 - Account locked (too many failed attempts)

---

3.4 Verify 2FA
POST /api/v1/auth/2fa/verify

Description: Verify TOTP code and complete login
FRD Reference: FR-UM-008
Authentication: Temp token from login
Rate Limit: 5 requests/5min per IP

Request Headers:
Authorization: Bearer <temp_token>

Request Body:
{
  "code": "string (6-digit TOTP code)",
  "trustDevice": "boolean (optional, default: false)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}

---

3.5 Logout
POST /api/v1/auth/logout

Description: Invalidate current session and tokens
FRD Reference: FR-UM-004
Authentication: Required
Rate Limit: 10 requests/min

Request Body:
{
  "allDevices": "boolean (optional, logout from all devices)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}

---

3.6 Refresh Token
POST /api/v1/auth/refresh

Description: Get new access token using refresh token
FRD Reference: FR-SC-002
Authentication: None (uses refresh token)
Rate Limit: 20 requests/hour per user

Request Body:
{
  "refreshToken": "string (required)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  }
}

---

3.7 Forgot Password
POST /api/v1/auth/forgot-password

Description: Request password reset email
FRD Reference: FR-UM-005
Authentication: None
Rate Limit: 3 requests/hour per IP

Request Body:
{
  "email": "string (required)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a password reset link has been sent",
    "expiresIn": 3600
  }
}

Note: Always returns success to prevent email enumeration

---

3.8 Reset Password
POST /api/v1/auth/reset-password

Description: Reset password with token from email
FRD Reference: FR-UM-005
Authentication: None
Rate Limit: 5 requests/hour per IP

Request Body:
{
  "token": "string (reset token from email)",
  "newPassword": "string (min 8 chars, complexity required)",
  "confirmPassword": "string (must match newPassword)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Password reset successfully",
    "userId": "uuid-v4"
  }
}

Error Responses:
400 - Invalid or expired token
409 - New password matches one of last 3 passwords

---

3.9 Enable 2FA
POST /api/v1/auth/2fa/enable

Description: Enable two-factor authentication
FRD Reference: FR-UM-008
Authentication: Required
Rate Limit: 5 requests/hour

Request Body:
{
  "password": "string (current password for confirmation)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "secret": "BASE32ENCODEDSECRET",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "backupCodes": [
      "ABCD-1234-EFGH-5678",
      "IJKL-9012-MNOP-3456"
    ],
    "message": "Scan QR code with authenticator app"
  }
}

---

3.10 Disable 2FA
POST /api/v1/auth/2fa/disable

Description: Disable two-factor authentication
FRD Reference: FR-UM-008
Authentication: Required
Rate Limit: 5 requests/hour

Request Body:
{
  "password": "string (current password)",
  "code": "string (6-digit TOTP code or backup code)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Two-factor authentication disabled"
  }
}

===========================================
4. USER MANAGEMENT ENDPOINTS
===========================================

4.1 Get Current User Profile
GET /api/v1/users/me

Description: Retrieve authenticated user's profile
FRD Reference: FR-UM-006
Authentication: Required
Rate Limit: 100 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "status": "active",
    "profilePicture": "https://cdn.example.com/avatars/user123.jpg",
    "bio": "Software developer",
    "onlineStatus": "online",
    "lastSeen": "2024-11-15T10:30:00Z",
    "twoFactorEnabled": true,
    "settings": {
      "notifications": {
        "email": true,
        "push": true,
        "inApp": true
      },
      "privacy": {
        "showOnlineStatus": true,
        "showLastSeen": true,
        "readReceipts": true
      }
    },
    "createdAt": "2024-11-15T10:30:00Z"
  }
}

---

4.2 Update User Profile
PUT /api/v1/users/me

Description: Update user profile information
FRD Reference: FR-UM-006
Authentication: Required
Rate Limit: 20 requests/hour

Request Body:
{
  "username": "string (optional, 3-50 chars)",
  "bio": "string (optional, max 500 chars)",
  "settings": {
    "notifications": {
      "email": "boolean",
      "push": "boolean"
    },
    "privacy": {
      "showOnlineStatus": "boolean",
      "readReceipts": "boolean"
    }
  }
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    // Updated user object
  }
}

---

4.3 Get User by ID
GET /api/v1/users/:userId

Description: Get public profile of specific user
FRD Reference: FR-UM-010
Authentication: Required
Rate Limit: 100 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "username": "janedoe",
    "profilePicture": "https://...",
    "bio": "Product designer",
    "onlineStatus": "away",
    "lastSeen": "2024-11-15T09:30:00Z",
    "isContact": true,
    "isBlocked": false
  }
}

---

4.4 Search Users
GET /api/v1/users/search?q=john&page=1&limit=20

Description: Search for users by username or email
FRD Reference: FR-UM-010
Authentication: Required
Rate Limit: 30 requests/min

Query Parameters:
- q: string (search query, min 2 chars)
- page: number (default: 1)
- limit: number (default: 20, max: 50)

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "username": "johndoe",
      "profilePicture": "https://...",
      "onlineStatus": "online"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasNext": true
  }
}

---

4.5 Update User Status
POST /api/v1/users/status

Description: Update online/away/busy status
FRD Reference: FR-UM-009
Authentication: Required
Rate Limit: 60 requests/min

Request Body:
{
  "status": "string (online|away|busy|offline)",
  "customMessage": "string (optional, max 100 chars)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "status": "away",
    "customMessage": "In a meeting",
    "updatedAt": "2024-11-15T10:30:00Z"
  }
}

---

4.6 Export User Data (GDPR)
GET /api/v1/users/data-export

Description: Request export of user's personal data
FRD Reference: FR-UM-011, FR-CP-001
Authentication: Required
Rate Limit: 1 request/24hours

Success Response (202 Accepted):
{
  "success": true,
  "data": {
    "message": "Data export request received. You'll receive an email within 24 hours",
    "requestId": "uuid-v4",
    "estimatedTime": "24 hours"
  }
}

---

4.7 Delete Account
DELETE /api/v1/users/me

Description: Request account deletion (GDPR compliance)
FRD Reference: FR-UM-007, FR-CP-001
Authentication: Required
Rate Limit: 3 requests/day

Request Body:
{
  "password": "string (required)",
  "reason": "string (optional)",
  "confirmation": "string (must be 'DELETE MY ACCOUNT')"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Account deletion scheduled. Data will be deleted within 30 days",
    "deletionDate": "2024-12-15T10:30:00Z"
  }
}

===========================================
5. MESSAGING ENDPOINTS
===========================================

5.1 Send Message
POST /api/v1/messages

Description: Send text message to user or group
FRD Reference: FR-MS-001, FR-MS-002
Authentication: Required
Rate Limit: 100 messages/min per user

Request Body:
{
  "recipientId": "string (user ID, required if not group)",
  "groupId": "string (group ID, required if not user)",
  "content": "string (required, max 10,000 chars)",
  "type": "string (text|file|image, default: text)",
  "fileId": "string (optional)",
  "replyToMessageId": "string (optional)"
}

Success Response (201 Created):
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "senderId": "uuid-v4",
    "recipientId": "uuid-v4",
    "content": "Hello, how are you?",
    "type": "text",
    "status": "sent",
    "isDelivered": false,
    "isRead": false,
    "createdAt": "2024-11-15T10:30:00Z",
    "editableUntil": "2024-11-15T10:35:00Z"
  }
}

---

5.2 Get Message History
GET /api/v1/messages?recipientId=user123&limit=50&page=1

Description: Retrieve message history
FRD Reference: FR-MS-011
Authentication: Required
Rate Limit: 60 requests/min

Query Parameters:
- recipientId: string (user ID)
- groupId: string (group ID)
- page: number (default: 1)
- limit: number (default: 50, max: 100)

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid",
      "senderId": "user-uuid-1",
      "content": "Hey, are we meeting today?",
      "type": "text",
      "isRead": true,
      "createdAt": "2024-11-15T09:00:00Z",
      "sender": {
        "username": "johndoe",
        "profilePicture": "https://..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234
  }
}

---

5.3 Edit Message
PUT /api/v1/messages/:messageId

Description: Edit message within 5-minute window
FRD Reference: FR-MS-005
Authentication: Required
Rate Limit: 30 requests/min

Request Body:
{
  "content": "string (required, max 10,000 chars)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "content": "Updated message content",
    "isEdited": true,
    "editedAt": "2024-11-15T10:32:00Z"
  }
}

Error Responses:
403 - Edit window expired (>5 min)
404 - Message not found

---

5.4 Delete Message
DELETE /api/v1/messages/:messageId?forEveryone=true

Description: Delete message (soft delete)
FRD Reference: FR-MS-006
Authentication: Required
Rate Limit: 30 requests/min

Query Parameters:
- forEveryone: boolean (delete for all if within 24h)

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "deletedAt": "2024-11-15T10:30:00Z",
    "deletedFor": "everyone"
  }
}

---

5.5 Mark Message as Read
POST /api/v1/messages/:messageId/read

Description: Mark message as read
FRD Reference: FR-MS-003
Authentication: Required
Rate Limit: 100 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "isRead": true,
    "readAt": "2024-11-15T10:30:00Z"
  }
}

---

5.6 Search Messages
GET /api/v1/messages/search?q=meeting&dateFrom=2024-11-01

Description: Search message history
FRD Reference: FR-MS-010
Authentication: Required
Rate Limit: 30 requests/min

Query Parameters:
- q: string (search query, min 2 chars)
- recipientId: string (optional)
- dateFrom: ISO8601 (optional)
- dateTo: ISO8601 (optional)
- page: number (default: 1)
- limit: number (default: 20)

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid",
      "content": "The meeting is at 3pm tomorrow",
      "sender": {
        "username": "johndoe"
      },
      "createdAt": "2024-11-14T10:00:00Z"
    }
  ],
  "pagination": { ... }
}

===========================================
6. GROUP MANAGEMENT ENDPOINTS
===========================================

6.1 Create Group
POST /api/v1/groups

Description: Create new group chat
FRD Reference: FR-MS-007
Authentication: Required
Rate Limit: 10 requests/hour

Request Body:
{
  "name": "string (required, 3-100 chars)",
  "description": "string (optional, max 500 chars)",
  "memberIds": ["userId1", "userId2"] (min 1, max 19)
}

Success Response (201 Created):
{
  "success": true,
  "data": {
    "id": "group-uuid",
    "name": "Project Team",
    "description": "Our project group",
    "creatorId": "user-uuid",
    "maxMembers": 20,
    "memberCount": 5,
    "members": [
      {
        "userId": "user-uuid-1",
        "username": "johndoe",
        "role": "admin",
        "joinedAt": "2024-11-15T10:30:00Z"
      }
    ],
    "createdAt": "2024-11-15T10:30:00Z"
  }
}

---

6.2 Get Group Details
GET /api/v1/groups/:groupId

Description: Retrieve group information
FRD Reference: FR-MS-007
Authentication: Required
Rate Limit: 60 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "group-uuid",
    "name": "Project Team",
    "description": "Our project group",
    "creatorId": "user-uuid",
    "memberCount": 8,
    "members": [ ... ],
    "settings": {
      "allowMemberInvite": true
    }
  }
}

---

6.3 Update Group
PUT /api/v1/groups/:groupId

Description: Update group (admins only)
FRD Reference: FR-MS-008
Authentication: Required (Group Admin)
Rate Limit: 20 requests/hour

Request Body:
{
  "name": "string (optional)",
  "description": "string (optional)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    // Updated group object
  }
}

---

6.4 Delete Group
DELETE /api/v1/groups/:groupId

Description: Delete group (creator only)
FRD Reference: FR-MS-007
Authentication: Required (Creator)
Rate Limit: 10 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Group deleted successfully",
    "deletedAt": "2024-11-15T10:30:00Z"
  }
}

---

6.5 Add Group Member
POST /api/v1/groups/:groupId/members

Description: Add member to group
FRD Reference: FR-MS-008
Authentication: Required (Admin)
Rate Limit: 30 requests/hour

Request Body:
{
  "userId": "string (required)",
  "role": "string (member|admin, default: member)"
}

Success Response (201 Created):
{
  "success": true,
  "data": {
    "groupId": "group-uuid",
    "member": {
      "userId": "user-uuid",
      "username": "newmember",
      "role": "member"
    },
    "memberCount": 9
  }
}

---

6.6 Remove Group Member
DELETE /api/v1/groups/:groupId/members/:userId

Description: Remove member from group
FRD Reference: FR-MS-008
Authentication: Required (Admin)
Rate Limit: 30 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Member removed successfully"
  }
}

---

6.7 Leave Group
POST /api/v1/groups/:groupId/leave

Description: Leave group voluntarily
FRD Reference: FR-MS-009
Authentication: Required
Rate Limit: 20 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "You have left the group",
    "leftAt": "2024-11-15T10:30:00Z"
  }
}

===========================================
7. CONTACT MANAGEMENT ENDPOINTS
===========================================

7.1 Get Contacts List
GET /api/v1/contacts?status=active&page=1

Description: Retrieve user's contacts
FRD Reference: FR-CT-005
Authentication: Required
Rate Limit: 60 requests/min

Query Parameters:
- status: string (active|blocked)
- page: number (default: 1)
- limit: number (default: 50)

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "contact-uuid",
      "status": "active",
      "user": {
        "id": "user-uuid",
        "username": "janedoe",
        "profilePicture": "https://...",
        "onlineStatus": "online"
      },
      "createdAt": "2024-11-10T08:00:00Z"
    }
  ],
  "pagination": { ... }
}

---

7.2 Add Contact
POST /api/v1/contacts

Description: Add user to contacts
FRD Reference: FR-CT-001
Authentication: Required
Rate Limit: 20 requests/day

Request Body:
{
  "userId": "string (required)"
}

Success Response (201 Created):
{
  "success": true,
  "data": {
    "id": "contact-uuid",
    "userId": "current-user",
    "contactUserId": "added-user",
    "status": "active",
    "createdAt": "2024-11-15T10:30:00Z"
  }
}

---

7.3 Remove Contact
DELETE /api/v1/contacts/:contactId

Description: Remove contact
FRD Reference: FR-CT-002
Authentication: Required
Rate Limit: 30 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Contact removed successfully"
  }
}

---

7.4 Block Contact
POST /api/v1/contacts/:contactId/block

Description: Block contact
FRD Reference: FR-CT-003
Authentication: Required
Rate Limit: 30 requests/hour

Request Body:
{
  "reason": "string (optional)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "contact-uuid",
    "status": "blocked",
    "blockedAt": "2024-11-15T10:30:00Z"
  }
}

---

7.5 Unblock Contact
DELETE /api/v1/contacts/:contactId/block

Description: Unblock contact
FRD Reference: FR-CT-004
Authentication: Required
Rate Limit: 30 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "status": "active",
    "unblockedAt": "2024-11-15T10:30:00Z"
  }
}

===========================================
8. FILE MANAGEMENT ENDPOINTS
===========================================

8.1 Upload File
POST /api/v1/files/upload

Description: Upload file for message
FRD Reference: FR-FL-001
Authentication: Required
Rate Limit: 10 uploads/hour
Content-Type: multipart/form-data

Form Data:
- file: File (max 25MB)
- messageId: string (optional)

Supported: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, mp4

Success Response (201 Created):
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "filename": "vacation.jpg",
    "fileSize": 1024576,
    "mimeType": "image/jpeg",
    "thumbnailPath": "/thumbs/file-uuid.jpg",
    "virusScanStatus": "pending",
    "uploadedAt": "2024-11-15T10:30:00Z",
    "url": "https://cdn.example.com/files/file-uuid"
  }
}

Error Responses:
400 - Invalid file type
413 - File too large (>25MB)
422 - Virus detected

---

8.2 Download File
GET /api/v1/files/:fileId

Description: Download file
FRD Reference: FR-FL-002
Authentication: Required
Rate Limit: 100 downloads/hour

Returns binary file data

Error Responses:
403 - No permission
404 - File not found
423 - File infected

---

8.3 Get File Thumbnail
GET /api/v1/files/:fileId/thumbnail

Description: Get image thumbnail (200x200px)
FRD Reference: FR-FL-003
Authentication: Required
Rate Limit: 200 requests/min

Returns binary thumbnail data

---

8.4 Delete File
DELETE /api/v1/files/:fileId

Description: Delete file
FRD Reference: FR-FL-004
Authentication: Required (Owner)
Rate Limit: 30 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "File deleted successfully"
  }
}

===========================================
9. CALL MANAGEMENT ENDPOINTS
===========================================

9.1 Initiate Call
POST /api/v1/calls/initiate

Description: Start video or voice call
FRD Reference: FR-VC-001
Authentication: Required
Rate Limit: 20 calls/hour

Request Body:
{
  "recipientId": "string (required)",
  "callType": "string (video|audio)",
  "offer": "object (WebRTC SDP)"
}

Success Response (201 Created):
{
  "success": true,
  "data": {
    "id": "call-uuid",
    "callerId": "user-uuid",
    "recipientId": "user-uuid-2",
    "callType": "video",
    "status": "calling",
    "iceServers": [
      { "urls": "stun:stun.example.com:3478" },
      {
        "urls": "turn:turn.example.com:3478",
        "username": "temp",
        "credential": "pass"
      }
    ],
    "createdAt": "2024-11-15T10:30:00Z"
  }
}

---

9.2 Accept Call
POST /api/v1/calls/:callId/accept

Description: Accept incoming call
FRD Reference: FR-VC-002
Authentication: Required
Rate Limit: 30 requests/min

Request Body:
{
  "answer": "object (WebRTC SDP)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "call-uuid",
    "status": "connected",
    "startedAt": "2024-11-15T10:30:30Z"
  }
}

---

9.3 Reject Call
POST /api/v1/calls/:callId/reject

Description: Reject incoming call
FRD Reference: FR-VC-003
Authentication: Required
Rate Limit: 30 requests/min

Request Body:
{
  "reason": "string (busy|declined)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "status": "rejected"
  }
}

---

9.4 End Call
POST /api/v1/calls/:callId/end

Description: End active call
FRD Reference: FR-VC-004
Authentication: Required
Rate Limit: 30 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "call-uuid",
    "status": "ended",
    "duration": 325,
    "endedAt": "2024-11-15T10:35:55Z"
  }
}

9.5 Get Call History
GET /api/v1/calls/history?callType=video&page=1

---

9.6 Get TURN Credentials

Note on Encryption: All WebRTC calls (video and audio) are encrypted end-to-end using the DTLS-SRTP protocol. The server only facilitates the connection and does not have access to the encryption keys, meaning it cannot decrypt the media stream.

GET /api/v1/calls/turn-credentials

Description: Get temporary credentials for the STUN/TURN server
FRD Reference: FR-VC-001
Authentication: Required
Rate Limit: 60 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "username": "<expiry>:<userId>",
    "password": "<hmac-sha1-hash>",
    "uris": [
      "turn:yourdomain.com:3478?transport=udp",
      "turn:yourdomain.com:3478?transport=tcp"
    ],
    "ttl": 86400
  }
}

===========================================
10. NOTIFICATION ENDPOINTS
===========================================

10.1 Get Notifications
GET /api/v1/notifications?read=false&page=1

Description: Retrieve notifications
FRD Reference: FR-NT-002
Authentication: Required
Rate Limit: 60 requests/min

Query Parameters:
- read: boolean (filter by status)
- type: string (message|call|mention|admin_action)
- page: number

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "type": "message",
      "title": "New message from John",
      "content": "Hey, are you free?",
      "read": false,
      "createdAt": "2024-11-15T10:30:00Z"
    }
  ],
  "unreadCount": 5,
  "pagination": { ... }
}

---

10.2 Mark as Read
PUT /api/v1/notifications/:notificationId/read

Description: Mark notification as read
FRD Reference: FR-NT-002
Authentication: Required
Rate Limit: 100 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "id": "notif-uuid",
    "read": true,
    "readAt": "2024-11-15T10:30:00Z"
  }
}

---

10.3 Mark All as Read
PUT /api/v1/notifications/read-all

Description: Mark all notifications as read
FRD Reference: FR-NT-002
Authentication: Required
Rate Limit: 20 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "message": "All notifications marked as read",
    "count": 12
  }
}

---

10.4 Update Preferences
PUT /api/v1/notifications/preferences

Description: Configure notification settings
FRD Reference: FR-NT-004
Authentication: Required
Rate Limit: 20 requests/hour

Request Body:
{
  "email": {
    "enabled": "boolean",
    "messages": "boolean"
  },
  "push": {
    "enabled": "boolean",
    "showPreview": "boolean"
  },
  "quietHours": {
    "enabled": "boolean",
    "startTime": "22:00",
    "endTime": "08:00"
  }
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    // Updated preferences
  }
}

===========================================
11. ADMIN ENDPOINTS
===========================================

All endpoints require role='admin'

11.1 Get All Users
GET /api/v1/admin/users?status=active&page=1

Description: List all users
FRD Reference: FR-AM-005
Authentication: Admin
Rate Limit: 100 requests/min

Query Parameters:
- status: string (pending|active|inactive)
- search: string
- page: number
- limit: number

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "lastSeen": "2024-11-15T10:30:00Z",
      "createdAt": "2024-11-10T08:00:00Z"
    }
  ],
  "pagination": { ... }
}

---

11.2 Get Pending Registrations
GET /api/v1/admin/users/pending

Description: List pending approvals
FRD Reference: FR-AM-001
Authentication: Admin
Rate Limit: 60 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "username": "newuser",
      "email": "new@example.com",
      "status": "pending",
      "registeredAt": "2024-11-15T10:00:00Z",
      "daysWaiting": 0
    }
  ],
  "total": 3
}

---

11.3 Approve User
PUT /api/v1/admin/users/:userId/approve

Description: Approve registration
FRD Reference: FR-AM-001
Authentication: Admin
Rate Limit: 30 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "status": "active",
    "approvedAt": "2024-11-15T10:30:00Z"
  }
}

---

11.4 Reject User
PUT /api/v1/admin/users/:userId/reject

Description: Reject registration
FRD Reference: FR-AM-002
Authentication: Admin
Rate Limit: 30 requests/hour

Request Body:
{
  "reason": "string (required)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "rejectedAt": "2024-11-15T10:30:00Z",
    "reason": "Invalid email domain"
  }
}

---

11.5 Deactivate User
PUT /api/v1/admin/users/:userId/deactivate

Description: Deactivate account
FRD Reference: FR-AM-003
Authentication: Admin
Rate Limit: 30 requests/hour

Request Body:
{
  "reason": "string (required)",
  "notifyUser": "boolean (default: true)"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "status": "inactive",
    "deactivatedAt": "2024-11-15T10:30:00Z"
  }
}

---

11.6 Reactivate User
PUT /api/v1/admin/users/:userId/activate

Description: Reactivate account
FRD Reference: FR-AM-004
Authentication: Admin
Rate Limit: 30 requests/hour

Success Response (200 OK):
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "status": "active"
  }
}

---

11.7 Get System Statistics
GET /api/v1/admin/stats?period=day

Description: System statistics
FRD Reference: FR-AM-005
Authentication: Admin
Rate Limit: 60 requests/min

Success Response (200 OK):
{
  "success": true,
  "data": {
    "users": {
      "total": 87,
      "active": 65,
      "pending": 3,
      "online": 12
    },
    "messages": {
      "total": 15234,
      "today": 456
    },
    "calls": {
      "total": 892,
      "active": 2
    },
    "storage": {
      "used": 54832947200,
      "available": 105167052800,
      "usedPercentage": 34.27
    }
  }
}

---

11.8 Get Audit Logs
GET /api/v1/admin/audit-logs

Description: Retrieve audit logs
FRD Reference: FR-AM-008
Authentication: Admin
Rate Limit: 100 requests/min

Query Parameters:
- userId: string (filter by user)
- action: string (filter by action)
- dateFrom: ISO8601
- dateTo: ISO8601
- page: number
- limit: number

Success Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "userId": "user-uuid",
      "action": "user_approved",
      "resourceType": "user",
      "ipAddress": "192.168.1.1",
      "createdAt": "2024-11-15T10:30:00Z"
    }
  ],
  "pagination": { ... }
}

---

11.9 Update System Settings
PUT /api/v1/admin/settings

Description: Configure system settings
FRD Reference: FR-AM-009
Authentication: Admin
Rate Limit: 10 requests/hour

Request Body:
{
  "messageRetentionDays": "number (1-365)",
  "maxFileSize": "number (bytes, max 25MB)",
  "maxGroupSize": "number (2-20)",
  "maintenanceMode": "boolean"
}

Success Response (200 OK):
{
  "success": true,
  "data": {
    // Updated settings
  }
}

---

11.10 Broadcast Announcement
POST /api/v1/admin/announcements

Description: Send system announcement
FRD Reference: FR-AM-010
Authentication: Admin
Rate Limit: 5 requests/day

Request Body:
{
  "title": "string (max 100 chars)",
  "message": "string (max 1000 chars)",
  "priority": "string (info|warning|critical)",
  "expiresAt": "ISO8601 (optional)"
}

Success Response (201 Created):
{
  "success": true,
  "data": {
    "id": "announcement-uuid",
    "title": "Scheduled Maintenance",
    "recipients": 87
  }
}

===========================================
12. WEBSOCKET EVENTS
===========================================

WebSocket URL: wss://api.yourdomain.com/socket.io
Protocol: Socket.io
Authentication: JWT in auth header

Connection:
const socket = io('wss://api.yourdomain.com', {
  auth: { token: 'jwt-token' }
});

12.1 Client → Server Events

message.send
Payload: { recipientId, content, type }
Rate Limit: 100/min

message.typing
Payload: { recipientId, isTyping }
Rate Limit: 1/sec

user.status.update
Payload: { status, customMessage }

call.signal
Payload: { callId, type, data }

12.2 Server → Client Events

message.new
Payload: { id, senderId, content, createdAt }

message.delivered
Payload: { messageId, deliveredAt }

message.read
Payload: { messageId, readAt }

message.typing
Payload: { userId, username, isTyping }

message.edited
Payload: { messageId, content, editedAt }

message.deleted
Payload: { messageId, deletedFor }

user.status.changed
Payload: { userId, status, lastSeen }

call.incoming
Payload: { callId, callerId, callerName, callType }

call.accepted
Payload: { callId, acceptedAt }

call.rejected
Payload: { callId, reason }

call.ended
Payload: { callId, duration }

call.signal
Payload: { callId, type, data }

notification.new
Payload: { id, type, title, content }

group.updated
Payload: { groupId, changes }

group.member.added
Payload: { groupId, userId }

group.member.removed
Payload: { groupId, userId }

12.3 WebRTC Signaling Flow

The following events are used to establish a WebRTC connection between two peers.

1.  **Caller sends an offer:**
    -   Event: `webrtc_offer`
    -   Payload: `{ targetUserId, signal }`
    -   The `signal` object contains the SDP offer.

2.  **Recipient receives the offer and sends an answer:**
    -   Event: `webrtc_answer`
    -   Payload: `{ targetUserId, signal }`
    -   The `signal` object contains the SDP answer.

3.  **ICE candidates are exchanged:**
    -   Event: `webrtc_ice_candidate`
    -   Payload: `{ targetUserId, signal }`
    -   The `signal` object contains the ICE candidate.

This process continues until a connection is established.

12.4 Network Quality Monitoring

Network quality monitoring is a client-side responsibility. The client application should use the `RTCPeerConnection.getStats()` method to periodically collect statistics about the WebRTC connection. These statistics can be used to display a network quality indicator to the user.

The client can monitor metrics like `packetsLost`, `jitter`, and `roundTripTime` to determine the quality of the connection.

===========================================
13. ERROR HANDLING
===========================================

13.1 Error Response Format

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2024-11-15T10:30:00Z",
    "requestId": "uuid-v4"
  }
}

13.2 Common Error Codes

Authentication (401):
- INVALID_CREDENTIALS
- TOKEN_EXPIRED
- ACCOUNT_PENDING
- ACCOUNT_LOCKED
- TWO_FACTOR_REQUIRED

Authorization (403):
- INSUFFICIENT_PERMISSIONS
- USER_BLOCKED
- EDIT_WINDOW_EXPIRED

Validation (400, 422):
- VALIDATION_ERROR
- INVALID_EMAIL
- PASSWORD_TOO_WEAK
- CONTENT_TOO_LONG

Resource (404):
- USER_NOT_FOUND
- MESSAGE_NOT_FOUND
- GROUP_NOT_FOUND

Conflict (409):
- EMAIL_ALREADY_EXISTS
- MAX_MEMBERS_REACHED
- CALL_IN_PROGRESS

Rate Limit (429):
- RATE_LIMIT_EXCEEDED

Server (500):
- INTERNAL_SERVER_ERROR
- DATABASE_ERROR

===========================================
14. RATE LIMITING
===========================================

Rate Limit Headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699876543

Configuration:
Authentication: 5 req/15min per IP
Messaging: 100 req/min per user
File Upload: 10 req/hour per user
Calls: 20 req/hour per user

429 Response:
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 45
    }
  }
}

===========================================
15. SECURITY SPECIFICATIONS
===========================================

15.1 Authentication
- JWT tokens (RS256 signing)
- Access token: 24hr expiry
- Refresh token: 7-day expiry
- HTTPS/TLS 1.2+ required

15.2 Password Requirements
- Min 8 characters
- 1 uppercase, 1 lowercase, 1 number, 1 special
- Cannot reuse last 3 passwords

15.3 Input Validation
- SQL injection prevention (parameterized queries)
- XSS protection (HTML sanitization)
- CSRF tokens for state changes
- File type/size validation

15.4 File Upload Security
- Max 25MB size limit
- Virus scanning (ClamAV)
- Whitelist file types
- Randomized filenames

===========================================
16. DATA MODELS
===========================================

User:
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "role": "user|admin",
  "status": "pending|active|inactive",
  "profilePicture": "url",
  "onlineStatus": "online|away|offline",
  "twoFactorEnabled": "boolean",
  "createdAt": "ISO8601"
}

Message:
{
  "id": "uuid",
  "senderId": "uuid",
  "recipientId": "uuid",
  "groupId": "uuid",
  "content": "string",
  "type": "text|file|image",
  "isRead": "boolean",
  "isEdited": "boolean",
  "createdAt": "ISO8601"
}

Group:
{
  "id": "uuid",
  "name": "string",
  "creatorId": "uuid",
  "memberCount": "number",
  "maxMembers": 20
}

Call:
{
  "id": "uuid",
  "callerId": "uuid",
  "recipientId": "uuid",
  "callType": "video|audio",
  "status": "calling|connected|ended",
  "duration": "number"
}

===========================================
17. EXAMPLES
===========================================

Complete Flow:

# 1. Register
curl -X POST https://api.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"Pass123!","confirmPassword":"Pass123!"}'

# 2. Login
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Pass123!"}'

# 3. Send Message
curl -X POST https://api.example.com/api/v1/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"user-123","content":"Hello!"}'

# 4. Upload File
curl -X POST https://api.example.com/api/v1/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@image.jpg"

# 5. Initiate Call
curl -X POST https://api.example.com/api/v1/calls/initiate \
  -H "Authorization: Bearer <token>" \
  -d '{"recipientId":"user-123","callType":"video"}'

===========================================
END OF API SPECIFICATION
===========================================

Version: 1.0
Total Endpoints: 58 REST + 15 WebSocket Events
Last Updated: November 2024
