# Regression Test Plan - Release Preparation

**Project**: Messenger with Video Calls
**Date**: 2025-10-26
**Prepared by**: Senior QA Engineer
**Target Release**: Production v1.0

---

## Executive Summary

This regression test plan covers comprehensive testing of all modules before production release. The application supports up to 100 users with 1-to-1 video calling, group messaging, and file sharing.

---

## Test Scope

### In Scope:
1. **Authentication & Authorization** - Login, registration, password reset, 2FA
2. **User Management** - Profile, admin approval, user status
3. **Messaging** - 1-to-1, group messages, message editing/deletion
4. **File Sharing** - Upload, download, virus scanning, thumbnails
5. **Groups** - CRUD operations, member management, permissions
6. **Calls** - Video/audio calls, signaling, timeout mechanism
7. **Notifications** - In-app, email, push notifications, preferences
8. **Admin Panel** - User approval, statistics, reports, system settings, announcements
9. **Contacts** - Add, block, unblock contacts
10. **Encryption** - E2E encryption for private messages
11. **API Responses** - Standard format, error handling
12. **Database Integrity** - Transactions, foreign keys, constraints
13. **Security** - Input validation, rate limiting, SQL injection prevention

### Out of Scope:
- Visual/UI testing (no monitor available)
- Browser compatibility testing
- Performance/load testing (separate test plan)
- Mobile app testing (separate codebase)

---

## Test Environment

- **OS**: Windows (MSYS_NT-10.0-26100)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL + Redis
- **Testing Method**: Code analysis + API endpoint verification
- **Test Data**: Using existing test users and database records

---

## Test Modules & Priority

| Module | Priority | Test Cases | Estimated Time |
|--------|----------|------------|----------------|
| Authentication | P0 (Critical) | 15 | 2 hours |
| User Management | P0 (Critical) | 12 | 1.5 hours |
| Messaging | P0 (Critical) | 20 | 3 hours |
| File Sharing | P1 (High) | 15 | 2 hours |
| Groups | P1 (High) | 18 | 2.5 hours |
| Calls | P1 (High) | 12 | 2 hours |
| Notifications | P1 (High) | 10 | 1.5 hours |
| Admin Panel | P2 (Medium) | 15 | 2 hours |
| System Settings | P2 (Medium) | 8 | 1 hour |
| Announcements | P2 (Medium) | 8 | 1 hour |
| Contacts | P2 (Medium) | 10 | 1.5 hours |
| Encryption | P1 (High) | 8 | 1.5 hours |

**Total**: 151 test cases, ~20 hours

---

## Testing Approach

### 1. Code Analysis
- Review all controller methods for error handling
- Verify transaction usage in multi-step operations
- Check input validation schemas
- Verify API response format consistency
- Review security measures (rate limiting, authentication)

### 2. Database Schema Review
- Verify foreign key constraints
- Check indexes on frequently queried columns
- Verify CASCADE/SET NULL behavior
- Review data types and constraints

### 3. API Endpoint Testing
- Verify all routes are properly registered
- Check authentication/authorization middleware
- Test error responses (400, 401, 403, 404, 500)
- Verify request/response format

### 4. Integration Points
- WebSocket event handling
- Email service integration
- File upload service (ClamAV)
- Redis caching
- Audit logging

### 5. Security Testing
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection
- Rate limiting enforcement
- Password hashing (bcrypt)

---

## Test Cases by Module

### Authentication (P0)
1. ✅ User registration with valid data
2. ✅ User registration with duplicate email/username
3. ✅ Login with correct credentials
4. ✅ Login with incorrect credentials
5. ✅ Login rate limiting (5 attempts per 15 min)
6. ✅ JWT token generation and validation
7. ✅ Refresh token flow
8. ✅ Logout (session cleanup)
9. ✅ Password reset request
10. ✅ Password reset token validation
11. ✅ Change password while authenticated
12. ✅ Email verification flow
13. ✅ 2FA enable/disable
14. ✅ Protected routes require authentication
15. ✅ Expired token handling

### User Management (P0)
1. ✅ Get user profile (self)
2. ✅ Update user profile
3. ✅ Upload avatar
4. ✅ Admin approval workflow
5. ✅ User status transitions (pending → active → inactive)
6. ✅ Admin deactivate user
7. ✅ Admin reactivate user
8. ✅ User role enforcement (admin vs user)
9. ✅ Get all users (admin only)
10. ✅ Search users by username/email
11. ✅ Online status updates
12. ✅ Last seen timestamp

### Messaging (P0)
1. ✅ Send 1-to-1 message
2. ✅ Send group message
3. ✅ Edit own message
4. ✅ Delete own message (soft delete)
5. ✅ Cannot edit other user's message
6. ✅ Mark message as read
7. ✅ Mark message as delivered
8. ✅ Get conversation history
9. ✅ Message pagination
10. ✅ Search messages
11. ✅ Message retention (30 days)
12. ✅ Encrypted message storage (E2E)
13. ✅ WebSocket message delivery
14. ✅ Typing indicators
15. ✅ File attachment in message
16. ✅ Reply to message
17. ✅ Forward message
18. ✅ Bulk message operations
19. ✅ Unread message count
20. ✅ Message rate limiting (30/min)

### File Sharing (P1)
1. ✅ Upload allowed file types
2. ✅ Reject disallowed file types
3. ✅ Reject files exceeding size limit (25MB)
4. ✅ Virus scanning integration (ClamAV)
5. ✅ Quarantine infected files
6. ✅ Thumbnail generation (images)
7. ✅ File download
8. ✅ File deletion
9. ✅ File metadata retrieval
10. ✅ Files linked to messages
11. ✅ Orphan file cleanup
12. ✅ File access permissions
13. ✅ Upload rate limiting (10/hour)
14. ✅ File storage path security
15. ✅ MIME type validation

### Groups (P1)
1. ✅ Create group (max 20 members)
2. ✅ Update group details (admin only)
3. ✅ Add member to group
4. ✅ Remove member from group (admin only)
5. ✅ Leave group (self)
6. ✅ Update member role (admin/member)
7. ✅ Get group members
8. ✅ Get group messages
9. ✅ Delete group (admin only)
10. ✅ Group member limit enforcement (20)
11. ✅ Group permissions enforcement
12. ✅ Cannot add duplicate members
13. ✅ Cannot add inactive users
14. ✅ Concurrent member addition (race condition)
15. ✅ Transaction handling on errors
16. ✅ WebSocket group events
17. ✅ Group search
18. ✅ Group avatar upload

### Calls (P1)
1. ✅ Initiate audio call
2. ✅ Initiate video call
3. ✅ Accept call
4. ✅ Reject call
5. ✅ End active call
6. ✅ Call timeout (60 seconds)
7. ✅ Call duration tracking
8. ✅ Cannot call self
9. ✅ Cannot call inactive user
10. ✅ Concurrent call limit (1 per user)
11. ✅ WebSocket signaling
12. ✅ Call history

### Notifications (P1)
1. ✅ Create notification
2. ✅ Get user notifications
3. ✅ Mark notification as read
4. ✅ Mark all as read
5. ✅ Bulk mark as read
6. ✅ Get unread count
7. ✅ Notification preferences (enable/disable)
8. ✅ Multi-channel delivery (in-app, email, push)
9. ✅ Rate limiting (30/min, 500/hour, 2000/day)
10. ✅ Auto-cleanup expired notifications

### Admin Panel (P2)
1. ✅ Get pending users
2. ✅ Approve user
3. ✅ Reject user (with reason)
4. ✅ Get system statistics
5. ✅ Get audit logs
6. ✅ Get reports
7. ✅ Resolve report
8. ✅ Export audit logs (CSV/PDF)
9. ✅ Export reports (CSV/PDF)
10. ✅ Export statistics (CSV/PDF)
11. ✅ Admin-only route protection
12. ✅ Audit logging for admin actions
13. ✅ Export rate limiting (5/hour)
14. ✅ Search/filter audit logs
15. ✅ Search/filter reports

### System Settings (P2)
1. ✅ Get system settings
2. ✅ Update system settings (admin only)
3. ✅ Settings validation
4. ✅ Settings persistence across restart
5. ✅ Feature flag management
6. ✅ Rate limiting configuration
7. ✅ Notification settings
8. ✅ Transaction handling

### Announcements (P2)
1. ✅ Create announcement (admin only)
2. ✅ Update announcement (admin only)
3. ✅ Delete announcement (admin only)
4. ✅ Get all announcements (admin)
5. ✅ Get active announcements (user)
6. ✅ Expiration filtering
7. ✅ Pagination
8. ✅ Transaction handling

### Contacts (P2)
1. ✅ Add contact
2. ✅ Remove contact
3. ✅ Get contact list
4. ✅ Block user
5. ✅ Unblock user
6. ✅ Get blocked users
7. ✅ Cannot message blocked user
8. ✅ Cannot call blocked user
9. ✅ Contact synchronization
10. ✅ Duplicate contact prevention

### Encryption (P1)
1. ✅ E2E encryption enabled for 1-to-1 messages
2. ✅ Public key exchange
3. ✅ Private key storage (client-side only)
4. ✅ Encrypted content field used
5. ✅ Server cannot decrypt messages
6. ✅ Key rotation mechanism
7. ✅ Encryption status indicator
8. ✅ Fallback to unencrypted (if keys unavailable)

---

## Risk Assessment

### High Risk Areas:
1. **File Upload Security** - Virus scanning, type validation, size limits
2. **Group Member Management** - Race conditions, member limits
3. **Database Transactions** - Partial updates, rollback failures
4. **WebSocket Connections** - Event delivery, connection drops
5. **Call Signaling** - Timeout mechanism, concurrent calls
6. **Rate Limiting** - Bypass attempts, distributed attacks
7. **Admin Privileges** - Unauthorized access, privilege escalation

### Medium Risk Areas:
1. **Message Delivery** - WebSocket failures, offline users
2. **Notification Delivery** - Email failures, push failures
3. **File Storage** - Disk space, orphan files
4. **Session Management** - Token expiry, session cleanup
5. **Data Retention** - 30-day message cleanup

### Low Risk Areas:
1. **UI/UX Issues** - Not blocking for backend release
2. **Performance Optimization** - Acceptable for 100 users
3. **Logging** - Non-critical failures

---

## Test Data Requirements

### Users:
- 3 admin users (active)
- 10 regular users (active)
- 2 pending users (awaiting approval)
- 2 inactive users (deactivated)

### Groups:
- 3 groups with 5-10 members
- 1 group at member limit (20 members)
- 1 empty group

### Messages:
- 50+ messages across different conversations
- Messages with file attachments
- Edited messages
- Deleted messages

### Files:
- Images (JPG, PNG)
- Documents (PDF, DOCX)
- Infected test file (EICAR test)

### Calls:
- Completed calls with duration
- Missed calls
- Rejected calls
- Expired calls (timed out)

---

## Acceptance Criteria

### Must Pass (P0):
- All authentication flows work correctly
- All user management operations work correctly
- Messages can be sent, received, edited, deleted
- No SQL injection vulnerabilities
- No XSS vulnerabilities
- Rate limiting enforced on all critical endpoints
- Transactions rollback properly on errors
- WebSocket events delivered reliably

### Should Pass (P1):
- File uploads work with virus scanning
- Groups support full CRUD with proper permissions
- Calls timeout after 60 seconds
- Notifications delivered to all channels
- E2E encryption works for 1-to-1 messages

### Nice to Pass (P2):
- Admin panel fully functional
- System settings persist correctly
- Announcements work with expiration
- Contacts can be blocked/unblocked

---

## Bug Reporting Template

```markdown
## BUG-XXX: [Short Description]

**Severity**: Critical | High | Medium | Low
**Priority**: P0 | P1 | P2 | P3
**Module**: [Module Name]
**File**: [File Path:Line Number]

**Description**:
[Detailed description of the bug]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happens]

**Impact**:
[How this affects users/system]

**Root Cause**:
[Technical explanation]

**Proposed Fix**:
[How to fix it]

**Code Reference**:
```language
[Relevant code snippet]
```
```

---

## Testing Schedule

### Phase 1: Code Analysis (4 hours)
- Review all controllers
- Review all models
- Review all routes
- Review middleware
- Review services

### Phase 2: API Testing (8 hours)
- Authentication module
- User management module
- Messaging module
- File sharing module
- Groups module
- Calls module
- Notifications module

### Phase 3: Integration Testing (4 hours)
- Admin panel
- System settings
- Announcements
- Contacts
- Encryption

### Phase 4: Security Testing (3 hours)
- SQL injection testing
- XSS testing
- Rate limiting verification
- Authentication bypass attempts

### Phase 5: Regression Testing (1 hour)
- Re-test fixed bugs
- Smoke test all critical paths

**Total Estimated Time**: 20 hours

---

## Deliverables

1. ✅ Regression Test Plan (this document)
2. 🔄 Test Execution Report (in progress)
3. 🔄 Bug Report (bugs.md)
4. ⏳ Test Summary Report
5. ⏳ Sign-off Recommendation

---

## Sign-off Criteria

Release is approved when:
- [ ] All P0 bugs fixed
- [ ] All P1 bugs fixed or mitigated
- [ ] No open critical/high security vulnerabilities
- [ ] All acceptance criteria met
- [ ] Regression test pass rate ≥ 95%
- [ ] Senior QA Engineer approval
- [ ] Technical Lead approval

---

**Status**: 🔄 **IN PROGRESS**
**Next Step**: Execute test cases and document findings

---

**Document Version**: 1.0
**Last Updated**: 2025-10-26
**Prepared by**: Senior QA Engineer
