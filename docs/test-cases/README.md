# Test Cases Documentation

Comprehensive test cases for the Messenger Application with Video Calling.

## Overview

This directory contains detailed test cases covering all functional and non-functional requirements from [docs/frd.md](../frd.md).

## Test Case Files

### 1. [Authentication Test Cases](01-authentication.md)
**Coverage:** FR-UM-001 through FR-UM-011

- **User Registration** (TC-UM-001): Valid registration, invalid inputs, duplicate email, SQL injection, XSS
- **Email Verification** (TC-UM-002): Successful verification, expired links, resend requests
- **User Login** (TC-UM-003): Successful login, incorrect credentials, account lockout, 2FA, session management
- **User Logout** (TC-UM-004): Session invalidation, multi-device logout
- **Password Reset** (TC-UM-005): Reset flow, expired tokens, password history
- **Profile Management** (TC-UM-006): View/update profile, username uniqueness, profile pictures, bio
- **Account Deletion** (TC-UM-007): GDPR-compliant deletion, data anonymization
- **Two-Factor Authentication** (TC-UM-008): Enable/disable 2FA, TOTP codes, backup codes
- **User Status** (TC-UM-009): Online/offline/away status, custom status messages
- **User Search** (TC-UM-010): Search by username/email, pagination, blocked user exclusion
- **Data Export** (TC-UM-011): GDPR data portability, JSON export, download links

**Test Scenarios:** 60+

---

### 2. [Messaging Test Cases](02-messaging.md)
**Coverage:** FR-MS-001 through FR-MS-012

- **Send 1-to-1 Messages** (TC-MS-001): Text messages, offline users, character limits, emojis, URLs, XSS prevention
- **Message Status** (TC-MS-003): Sent/delivered/read indicators, read receipts, group status
- **Typing Indicators** (TC-MS-004): Real-time typing, auto-clear, multiple users typing
- **Message Editing** (TC-MS-005): Edit within time limit, edit history, deleted message editing
- **Message Deletion** (TC-MS-006): Delete for me, delete for everyone, time limits, file attachments
- **Create Group Chat** (TC-MS-007): Min/max participants, group names, descriptions, avatars
- **Manage Group Members** (TC-MS-008): Add/remove members, promote/demote admins, creator protection
- **Leave Group** (TC-MS-009): Regular members, admins, creator restrictions
- **Message Search** (TC-MS-010): Full-text search, filters, pagination, retention period
- **Message History** (TC-MS-011): Load history, pagination, retention, encryption
- **E2E Encryption** (TC-MS-012): libsodium encryption, key exchange, server cannot decrypt

**Test Scenarios:** 60+

---

### 3. [File Sharing & Calls Test Cases](03-files-calls.md)
**Coverage:** FR-FL-001 through FR-FL-004, FR-VC-001 through FR-VC-010

#### File Sharing
- **File Upload** (TC-FL-001): Valid files, size limits, unsupported types, malware detection, rate limiting, thumbnails
- **File Download** (TC-FL-002): Successful downloads, authorization, expired links, infected files
- **Thumbnail Generation** (TC-FL-003): Image thumbnails, aspect ratio, fallback icons
- **File Deletion** (TC-FL-004): Delete with message, storage cleanup, audit logging

#### Video/Voice Calls
- **Initiate Call** (TC-VC-001): Video/voice calls, timeout, offline users, concurrent limits
- **Accept Call** (TC-VC-002): WebRTC handshake, P2P connection, TURN fallback, permissions
- **Reject Call** (TC-VC-003): Rejection flow, notifications
- **End Call** (TC-VC-004): Call termination, duration tracking, connection loss
- **Mute/Unmute** (TC-VC-005): Audio controls, status indicators
- **Video Toggle** (TC-VC-006): Camera controls, voice-only mode
- **Network Quality** (TC-VC-007): Quality indicators, degradation warnings
- **Call Encryption** (TC-VC-008): DTLS-SRTP, E2E encryption
- **Call History** (TC-VC-009): History view, filters, retention
- **Incoming Notifications** (TC-VC-010): Real-time notifications, push notifications, ringtones

**Test Scenarios:** 55+

---

### 4. [Admin & Contact Management Test Cases](04-admin-contacts.md)
**Coverage:** FR-CT-001 through FR-CT-005, FR-AM-001 through FR-AM-010

#### Contact Management
- **Add Contact** (TC-CT-001): Direct add, duplicates, contact limit
- **Remove Contact** (TC-CT-002): Removal flow, conversation preservation
- **Block Contact** (TC-CT-003): Block functionality, message/call blocking, privacy
- **Unblock Contact** (TC-CT-004): Unblock flow, communication restoration
- **View Contacts** (TC-CT-005): Contacts list, online status, search/filter

#### Admin Features
- **Approve Registration** (TC-AM-001): View pending, approve users, bulk approve
- **Reject Registration** (TC-AM-002): Reject with reason, data deletion
- **Deactivate Account** (TC-AM-003): Deactivation flow, session termination, admin protection
- **Reactivate Account** (TC-AM-004): Reactivation, data preservation
- **System Statistics** (TC-AM-005): Dashboard metrics, storage usage, export
- **Performance Monitoring** (TC-AM-006): Real-time metrics, historical data, alerts
- **User Reports** (TC-AM-007): View reports, investigate, take action, statistics
- **Audit Logs** (TC-AM-008): Comprehensive logging, filtering, search, export, immutability
- **System Settings** (TC-AM-009): Configuration, maintenance mode, feature flags, rate limits
- **Announcements** (TC-AM-010): Broadcast messages, scheduling, user dismissal

**Test Scenarios:** 60+

---

### 5. [Security & Compliance Test Cases](05-security-compliance.md)
**Coverage:** FR-SC-001 through FR-SC-007, FR-CP-001 through FR-CP-004

#### Security
- **Password Security** (TC-SC-001): bcrypt hashing, complexity enforcement, password history, rate limiting
- **Session Management** (TC-SC-002): JWT expiration, session timeout, invalidation, concurrent sessions
- **Rate Limiting** (TC-SC-003): Login, API, messaging, file upload, contact addition limits
- **Data Encryption** (TC-SC-004): TLS 1.2+, E2E encryption, file encryption at rest, key rotation
- **Malware Scanning** (TC-SC-005): ClamAV integration, infected file detection, virus definitions
- **Input Validation** (TC-SC-006): XSS prevention, SQL injection prevention, email/URL validation
- **CSRF Protection** (TC-SC-007): Token validation, expiration, SameSite cookies

#### Compliance
- **GDPR Compliance** (TC-CP-001): Privacy policy, user consent, data download, account deletion, breach notification
- **Data Retention** (TC-CP-002): Message retention (30d), call logs (90d), audit logs (1y), backups
- **Audit Trail** (TC-CP-003): Comprehensive logging, immutability, integrity verification, export
- **Consent Management** (TC-CP-004): Granular consent, consent history, modification, withdrawal

**Test Scenarios:** 55+

---

### 6. [Performance & Integration Test Cases](06-performance-integration.md)
**Coverage:** NFR-PF-001 through NFR-PF-005, NFR-SC-001 through NFR-SC-003, Integration Testing

#### Performance
- **Message Delivery** (TC-PF-001): Latency testing (median <200ms, p95 <500ms), concurrent load
- **Page Load** (TC-PF-002): Initial load (<2s), Lighthouse score (>90), code splitting
- **System Availability** (TC-PF-003): Uptime (99.5%), graceful degradation, health checks
- **Concurrent Users** (TC-PF-004): 40 WebSocket connections, performance at capacity, resource monitoring
- **Call Quality** (TC-PF-005): 720p resolution, adaptive bitrate, Opus/VP8/H.264 codecs

#### Scalability
- **User Scalability** (TC-SC-001): 100 registered users, performance testing
- **Storage Scalability** (TC-SC-002): Monitoring, alerts at 80%, automatic cleanup
- **Message Throughput** (TC-SC-003): 1000 msgs/min, no message loss, queue monitoring

#### Integration
- **WebSocket Integration** (TC-INT-001): Connection lifecycle, auto-reconnect, heartbeat
- **Database Integration** (TC-INT-002): Connection pool, transactions, query performance
- **Redis Cache** (TC-INT-003): Cache hit/miss, invalidation, failure handling
- **Email Service** (TC-INT-004): SendGrid/SES delivery, retry logic, unsubscribe
- **File Storage** (TC-INT-005): Upload/download, disk monitoring
- **ClamAV** (TC-INT-006): Scan availability, failure handling
- **FCM Push** (TC-INT-007): Push delivery, token registration, failure handling
- **TURN Server** (TC-INT-008): NAT traversal, authentication

#### End-to-End
- **User Journeys** (TC-E2E-001): Complete registration to first message, full call flow, file sharing
- **Cross-Browser** (TC-E2E-002): Chrome, Firefox, Safari, Edge compatibility
- **Mobile App** (TC-E2E-003): Android app features, screen sizes

**Test Scenarios:** 65+

---

### 7. [UI Components Test Cases](07-session-7-ui-components.md)
**Coverage:** UI Components, Empty States, Dark Mode, Shortcuts

- **Empty States** (TC-UI-001 to 006): Index, ChatView, CallHistory, BlockedContacts, NotificationCenter
- **Skeleton Loaders** (TC-UI-007 to 009): ChatList, Messages, CallHistory
- **Keyboard Shortcuts** (TC-UI-010 to 015): Chat switching, settings, close chat, send message
- **Dark Mode** (TC-UI-016 to 021): Toggle, component adaptation, error boundary
- **Accessibility** (TC-UI-022): Contrast ratios (WCAG AA)

**Test Scenarios:** 22+

---

### 8. [PWA, Notifications & Advanced Settings](08-pwa-notifications-settings.md)
**Coverage:** PWA, Offline, Notification Preferences, Session Management

- **PWA & Offline** (TC-PWA-001 to 004): Service Worker, Offline Page, Offline Queue, Install Prompt
- **Notification Settings** (TC-NT-001 to 005): Master toggle, Quiet Hours, DND, Granular types
- **Active Sessions** (TC-SC-008): Detailed view, revoke specific, revoke all others

**Test Scenarios:** 12+

---

### 9. [Encryption & Security Deep Dive](09-encryption-security.md)
**Coverage:** Dual Encryption, Key Backup, Rotation, Security Edge Cases

- **Dual Encryption** (TC-SEC-001): Multi-device support, payload verification
- **Key Management** (TC-SEC-002 to 003): Encrypted backup/restore, rotation, history
- **Security Logic** (TC-SEC-004): Group vs P2P distinctions, metadata integrity

**Test Scenarios:** 8+

---

## Test Coverage Summary

| Category | Functional Requirements | Test Cases | Priority |
|----------|------------------------|------------|----------|
| Authentication | FR-UM-001 to FR-UM-011 | 60+ | High |
| Messaging | FR-MS-001 to FR-MS-012 | 60+ | High |
| File Sharing | FR-FL-001 to FR-FL-004 | 20+ | High |
| Video/Voice Calls | FR-VC-001 to FR-VC-010 | 35+ | High |
| Contact Management | FR-CT-001 to FR-CT-005 | 15+ | Medium |
| Admin Features | FR-AM-001 to FR-AM-010 | 45+ | High |
| Security | FR-SC-001 to FR-SC-007 | 30+ | High |
| Compliance | FR-CP-001 to FR-CP-004 | 25+ | High |
| Performance | NFR-PF-001 to NFR-PF-005 | 20+ | High |
| Integration | Various | 25+ | High |
| End-to-End | Various | 15+ | High |
| UI Components | UI/UX | 22+ | Medium |
| PWA & Settings | FR-NT-004, FR-SC-002, PWA | 12+ | Medium |
| Encryption Security | FR-MS-012, FR-SC-004 | 8+ | Critical |

**Total Test Scenarios: 393+**

---

## Test Prioritization

### P0 - Critical (Must Pass for Release)
- User login/logout
- Send/receive messages
- E2E encryption
- Video/voice calls (initiate, accept, end)
- File upload/download with malware scanning
- Admin approval workflow
- Password security (bcrypt hashing)
- Rate limiting
- Data encryption (TLS, E2E)
- GDPR compliance (data export, account deletion)

### P1 - High (Should Pass for Release)
- User registration and email verification
- 2FA
- Message editing/deletion
- Group chat management
- Call quality and WebRTC
- Admin deactivation/reactivation
- Audit logging
- Session management
- Message delivery performance (<500ms p95)
- Cross-browser compatibility

### P2 - Medium (Nice to Have)
- Profile management
- Typing indicators
- Message search
- Contact management
- System statistics dashboard
- Storage monitoring
- Historical performance data
- Mobile app testing

### P3 - Low (Future Enhancements)
- Custom status messages
- Announcement broadcasts
- Report statistics
- Thumbnail generation fallback

---

## Test Environment Requirements

### Backend
- Node.js 18 LTS
- PostgreSQL 14
- Redis 7
- ClamAV (latest)
- Coturn STUN/TURN server

### Frontend
- Modern browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Android 10+ for mobile testing

### Infrastructure
- Docker & Docker Compose
- Prometheus & Grafana (monitoring)
- SendGrid or AWS SES (email)
- Firebase Cloud Messaging (push notifications)

### Test Data
- 10 test user accounts (active)
- 3 admin accounts
- 5 pending user registrations
- Sample messages (various types: text, emojis, URLs, files)
- Sample files (jpg, png, pdf, doc, xls, txt, zip, mp4)
- EICAR test virus file (for malware testing)

---

## Test Execution Guidelines

### Manual Testing
1. Follow test steps exactly as documented
2. Record actual results
3. Capture screenshots for failures
4. Log all defects in issue tracker with severity

### Automated Testing
1. Unit tests for business logic (services, utilities)
2. Integration tests for API endpoints
3. E2E tests for critical user journeys (Playwright/Cypress)
4. Load/performance tests (k6, Artillery)

### Regression Testing
- Execute full regression suite before each release
- Prioritize P0 and P1 test cases
- Automate repetitive tests

### Acceptance Testing
- Conduct UAT with actual users
- Validate against acceptance criteria in FRD
- Obtain sign-off from stakeholders

---

## Defect Tracking

### Severity Levels
- **Critical:** System crash, data loss, security vulnerability
- **High:** Major feature broken, workaround not available
- **Medium:** Feature partially working, workaround available
- **Low:** Cosmetic issue, no impact on functionality

### Defect Report Template
```
Title: [Brief description]
Test Case: [TC-XX-XXX]
Severity: [Critical/High/Medium/Low]
Priority: [P0/P1/P2/P3]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]

Expected Result: [What should happen]
Actual Result: [What actually happened]

Environment: [Browser/OS/Version]
Screenshots: [Attach if applicable]
Logs: [Relevant error messages]
```

---

## Test Metrics & Reporting

### Key Metrics
- **Test Coverage:** (Test Cases Executed / Total Test Cases) × 100
- **Pass Rate:** (Passed / Executed) × 100
- **Defect Density:** Defects / KLOC (thousand lines of code)
- **Defect Leakage:** (Defects Found in Production / Total Defects) × 100

### Test Reports
- **Daily:** Test execution status
- **Weekly:** Test summary with defect trends
- **Release:** Comprehensive test report with sign-off

---

## Testing Tools

### Recommended Tools
- **API Testing:** Postman, Insomnia
- **E2E Testing:** Playwright, Cypress
- **Load Testing:** k6, Artillery, Apache JMeter
- **Security Testing:** OWASP ZAP, Burp Suite
- **Browser Testing:** BrowserStack, Sauce Labs
- **Performance Monitoring:** Lighthouse, WebPageTest

---

## Test Sign-off Criteria

Release is approved for production when:
- ✅ All P0 test cases pass (100%)
- ✅ All P1 test cases pass (≥95%)
- ✅ No critical or high severity defects open
- ✅ Performance benchmarks met (message latency, page load)
- ✅ Security audit passed
- ✅ GDPR compliance verified
- ✅ UAT sign-off obtained
- ✅ Documentation complete

---

## Continuous Improvement

### Post-Release
- Analyze production incidents
- Update test cases based on lessons learned
- Add regression tests for fixed defects
- Review and optimize test automation

### Feedback Loop
- Collect feedback from QA team, developers, and users
- Identify gaps in test coverage
- Improve test case quality and clarity
- Update test data and environments

---

## Contact

**QA Lead:** [Name]
**Email:** [email@example.com]
**Last Updated:** 2024-11-XX

---

## References

- [Business Requirements Document (BRD)](../brd.md)
- [Functional Requirements Document (FRD)](../frd.md)
- [Architecture Document](../arch.md)
- [REST API Specification](../rest-api.md)
- [Code Guidelines](../CODE_GUIDELINES.md)
- [Development Roadmap](../roadmap.md)
