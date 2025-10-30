# Security & Compliance Test Cases

## SECURITY

## TC-SC-001: Password Security

### Test Scenario 1.1: Password Hashing with bcrypt
**Priority:** High
**Requirement:** FR-SC-001

**Test Steps:**
1. User registers with password: "Test@1234"
2. Inspect database users table
3. Check password_hash field

**Expected Results:**
- Password hashed with bcrypt
- Minimum 10 rounds (cost factor ≥10)
- Password hash format: $2b$10$... or $2a$10$...
- Original password not visible
- Hash different even for same password (salt)

---

### Test Scenario 1.2: Password Complexity Enforcement
**Priority:** High
**Requirement:** FR-SC-001

**Test Data:**
- "test" (too short)
- "testtest" (no uppercase, number, special)
- "TESTTEST" (no lowercase, number, special)
- "Testtest" (no number, special)
- "Test1234" (no special char)
- "Test@1234" (valid)

**Test Steps:**
1. Attempt registration with each password

**Expected Results:**
- First 5 passwords rejected
- Error: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, 1 special character"
- Last password accepted
- Validation enforced server-side and client-side

---

### Test Scenario 1.3: Password History (Prevent Reuse)
**Priority:** Medium
**Requirement:** FR-SC-001

**Preconditions:**
- User has 3 previous passwords in history

**Test Steps:**
1. User resets password
2. Attempt to use one of last 3 passwords
3. Attempt to use new unique password

**Expected Results:**
- Reuse of last 3 passwords rejected
- Error: "Cannot reuse recent passwords"
- New unique password accepted
- Password history enforced

---

### Test Scenario 1.4: Password Never in Logs
**Priority:** High
**Requirement:** FR-SC-001

**Test Steps:**
1. User registers/logs in
2. Search application logs for password
3. Search database logs for password

**Expected Results:**
- Password never logged in plaintext
- Not in application logs
- Not in database logs
- Not in error messages
- Security maintained

---

### Test Scenario 1.5: Failed Login Rate Limiting
**Priority:** High
**Requirement:** FR-SC-001, FR-SC-003

**Test Steps:**
1. Attempt login with wrong password 5 times within 15 minutes
2. Check if rate limit applied

**Expected Results:**
- After 5 failed attempts: account locked or rate limited
- Error: "Too many failed attempts. Try again in X minutes."
- Failed attempts logged with IP address
- Protection against brute force

---

## TC-SC-002: Session Management

### Test Scenario 2.1: JWT Access Token Expiration
**Priority:** High
**Requirement:** FR-SC-002

**Test Steps:**
1. User logs in, receives access token
2. Wait 24 hours and 1 minute
3. Make API request with expired token

**Expected Results:**
- Token expires after 24 hours
- API request fails with 401 Unauthorized
- Error: "Token expired"
- Token expiration enforced

---

### Test Scenario 2.2: JWT Refresh Token Expiration
**Priority:** High
**Requirement:** FR-SC-002

**Test Steps:**
1. User logs in, receives refresh token
2. Wait 7 days and 1 hour
3. Attempt to refresh access token

**Expected Results:**
- Refresh token expires after 7 days
- Refresh fails with 401 Unauthorized
- User must login again
- Session security maintained

---

### Test Scenario 2.3: Session Timeout on Inactivity
**Priority:** High
**Requirement:** FR-SC-002

**Test Steps:**
1. User logs in
2. Remain inactive for 30 minutes
3. Attempt to perform action

**Expected Results:**
- Session times out after 30 minutes of inactivity
- Action fails
- User redirected to login page
- Session removed from Redis/database

---

### Test Scenario 2.4: Session Invalidation on Logout
**Priority:** High
**Requirement:** FR-SC-002

**Test Steps:**
1. User logs in
2. User logs out
3. Attempt API request with old token

**Expected Results:**
- Logout invalidates JWT tokens
- Session removed from storage
- API request with old token fails
- Token blacklisted or session deleted

---

### Test Scenario 2.5: Concurrent Session Limit
**Priority:** Medium
**Requirement:** FR-SC-002

**Test Steps:**
1. User logs in from 5 different devices
2. Attempt 6th login
3. Check active sessions

**Expected Results:**
- Maximum 5 concurrent sessions enforced
- 6th login either terminates oldest session OR fails with error
- User can view all active sessions
- User can manually revoke sessions

---

### Test Scenario 2.6: Session Data Security
**Priority:** High
**Requirement:** FR-SC-002

**Test Steps:**
1. User logs in
2. Inspect session storage (Redis)
3. Check stored session data

**Expected Results:**
- Session stored with: user_id, IP, user_agent, device, created_at, expires_at
- No sensitive data (passwords, credit cards) in session
- Session ID unguessable (cryptographically secure)
- Session data encrypted if needed

---

### Test Scenario 2.7: Session Hijacking Prevention
**Priority:** High
**Requirement:** FR-SC-002

**Test Steps:**
1. User logs in from IP 192.168.1.1
2. Capture session token
3. Attempt to use token from IP 203.0.113.1

**Expected Results:**
- Session validation includes IP check (optional based on config)
- If IP binding enabled: request from different IP fails or triggers re-authentication
- User alerted of suspicious activity
- Session hijacking mitigated

---

## TC-SC-003: Rate Limiting

### Test Scenario 3.1: Login Rate Limit
**Priority:** High
**Requirement:** FR-SC-003

**Test Steps:**
1. Attempt 5 login requests from same IP within 15 minutes
2. Attempt 6th login

**Expected Results:**
- First 5 attempts processed
- 6th attempt blocked
- Response: 429 Too Many Requests
- Error: "Too many login attempts. Try again in 15 minutes."
- Rate limit per IP enforced

---

### Test Scenario 3.2: API Request Rate Limit
**Priority:** High
**Requirement:** FR-SC-003

**Test Steps:**
1. User makes 100 API requests within 1 minute
2. Attempt 101st request

**Expected Results:**
- First 100 requests succeed
- 101st request blocked
- Response: 429 Too Many Requests
- Error: "Rate limit exceeded. Try again in 1 minute."
- Rate-Limit headers in response:
  - X-RateLimit-Limit: 100
  - X-RateLimit-Remaining: 0
  - X-RateLimit-Reset: [timestamp]

---

### Test Scenario 3.3: Message Sending Rate Limit
**Priority:** High
**Requirement:** FR-SC-003

**Test Steps:**
1. Send 100 messages within 1 minute
2. Attempt 101st message

**Expected Results:**
- First 100 messages sent
- 101st message blocked
- Error: "Message rate limit exceeded"
- Prevents spam/abuse
- Per-user rate limit

---

### Test Scenario 3.4: File Upload Rate Limit
**Priority:** High
**Requirement:** FR-SC-003

**Test Steps:**
1. Upload 10 files within 1 hour
2. Attempt 11th upload

**Expected Results:**
- First 10 uploads succeed
- 11th upload blocked
- Error: "File upload limit reached. Try again in [X] minutes"
- 10 files per hour per user enforced

---

### Test Scenario 3.5: Contact Addition Rate Limit
**Priority:** Medium
**Requirement:** FR-SC-003

**Test Steps:**
1. Add 20 contacts in 1 day
2. Attempt to add 21st contact

**Expected Results:**
- First 20 additions succeed
- 21st addition blocked
- Error: "Daily contact addition limit reached"
- 20 per day per user enforced
- Prevents abuse

---

### Test Scenario 3.6: Rate Limit Configuration by Admin
**Priority:** Low
**Requirement:** FR-SC-003, FR-AM-009

**Test Steps:**
1. Admin changes API rate limit from 100 to 200 per minute
2. User makes 150 requests in 1 minute

**Expected Results:**
- Requests succeed (within new limit)
- New limit applied immediately
- Configurable thresholds
- Admin control

---

## TC-SC-004: Data Encryption

### Test Scenario 4.1: TLS 1.2+ for All Connections
**Priority:** High
**Requirement:** FR-SC-004, NFR-SE-003

**Test Steps:**
1. Attempt HTTPS connection with TLS 1.0
2. Attempt HTTPS connection with TLS 1.1
3. Attempt HTTPS connection with TLS 1.2
4. Check WebSocket connection (WSS)

**Expected Results:**
- TLS 1.0 rejected
- TLS 1.1 rejected
- TLS 1.2 accepted
- TLS 1.3 accepted (if supported)
- WebSocket uses WSS (secure WebSocket)
- All connections encrypted

---

### Test Scenario 4.2: E2E Encryption for 1-to-1 Messages
**Priority:** High
**Requirement:** FR-SC-004, FR-MS-012

**Test Steps:**
1. User A sends E2E message to User B
2. Check database storage
3. Attempt to decrypt on server

**Expected Results:**
- Message encrypted on client before transmission
- Database stores encrypted_content only
- Server cannot decrypt message
- libsodium encryption used
- End-to-end encryption verified

---

### Test Scenario 4.3: E2E Encryption for 1-to-1 Calls
**Priority:** High
**Requirement:** FR-SC-004, FR-VC-008

**Test Steps:**
1. Establish video call
2. Inspect WebRTC connection
3. Verify encryption

**Expected Results:**
- DTLS-SRTP encryption enabled
- Media streams encrypted end-to-end
- Server cannot decrypt audio/video
- Encryption keys exchanged securely
- Industry-standard WebRTC encryption

---

### Test Scenario 4.4: File Encryption at Rest
**Priority:** High
**Requirement:** FR-SC-004

**Test Steps:**
1. Upload file to server
2. Inspect file storage
3. Check encryption

**Expected Results:**
- Files encrypted at rest with AES-256
- Stored files not readable without decryption key
- Encryption keys securely managed
- File encryption transparent to user

---

### Test Scenario 4.5: Database Encryption for Sensitive Fields
**Priority:** High
**Requirement:** FR-SC-004

**Test Steps:**
1. Inspect database
2. Check sensitive fields (email, phone if stored)

**Expected Results:**
- Sensitive PII encrypted in database
- Encryption at field level or full database encryption
- Encryption keys securely managed (environment variables, vault)
- Transparent encryption/decryption

---

### Test Scenario 4.6: Encryption Key Rotation
**Priority:** Medium
**Requirement:** FR-SC-004

**Test Steps:**
1. Check encryption key age
2. Verify key rotation policy

**Expected Results:**
- Encryption keys rotated every 90 days
- Key rotation automated
- Old keys retained for decryption of old data
- Key management system in place

---

## TC-SC-005: Malware Scanning

### Test Scenario 5.1: ClamAV File Scan on Upload
**Priority:** High
**Requirement:** FR-SC-005

**Test Steps:**
1. Upload clean file (test.pdf)
2. Observe scan process

**Expected Results:**
- File scanned with ClamAV before storage
- Scan completes within 30 seconds
- Clean file passes scan
- Scan status stored in files table: "clean"
- File stored and accessible

---

### Test Scenario 5.2: Detect and Reject Infected File
**Priority:** High
**Requirement:** FR-SC-005

**Test Steps:**
1. Attempt to upload EICAR test virus file
2. Observe result

**Expected Results:**
- ClamAV detects malware
- Upload rejected immediately
- Error: "File contains malware and cannot be uploaded"
- File NOT stored on server
- Admin notified of malware attempt
- Incident logged with user_id, IP, filename

---

### Test Scenario 5.3: Scan Timeout Handling
**Priority:** Medium
**Requirement:** FR-SC-005

**Test Steps:**
1. Upload very large file causing scan timeout (>30 seconds)
2. Observe result

**Expected Results:**
- Scan times out after 30 seconds
- File quarantined
- User notified: "File scan timeout. Please try again later."
- Admin notified
- File not accessible until scan completes

---

### Test Scenario 5.4: Virus Definition Updates
**Priority:** Medium
**Requirement:** FR-SC-005

**Test Steps:**
1. Check ClamAV virus definition version
2. Wait 24 hours
3. Check version again

**Expected Results:**
- Virus definitions updated daily
- Automatic update process
- Latest definitions used for scanning
- Update logged

---

### Test Scenario 5.5: Download Block for Infected Files
**Priority:** High
**Requirement:** FR-SC-005, FR-FL-002

**Test Steps:**
1. File marked as infected in database
2. Attempt to download file
3. Observe result

**Expected Results:**
- Download blocked
- Error: "File failed security scan and cannot be downloaded"
- User safety prioritized
- Infected files not downloadable

---

## TC-SC-006: Input Validation & Sanitization

### Test Scenario 6.1: XSS Prevention in Messages
**Priority:** High
**Requirement:** FR-SC-006

**Test Steps:**
1. Send message: `<script>alert('XSS')</script>`
2. Recipient views message

**Expected Results:**
- Script tags not executed
- Message displayed as plain text: "&lt;script&gt;alert('XSS')&lt;/script&gt;"
- HTML entities escaped
- XSS attack prevented

---

### Test Scenario 6.2: SQL Injection Prevention
**Priority:** High
**Requirement:** FR-SC-006

**Test Steps:**
1. Register with username: `admin'; DROP TABLE users;--`
2. Check database

**Expected Results:**
- Input sanitized or rejected
- No SQL injection executed
- Database tables intact
- Parameterized queries used
- Validation enforced

---

### Test Scenario 6.3: Email Validation (RFC 5322)
**Priority:** High
**Requirement:** FR-SC-006

**Test Data:**
- "test@example.com" (valid)
- "test+tag@example.co.uk" (valid)
- "notanemail" (invalid)
- "test@" (invalid)
- "@example.com" (invalid)

**Test Steps:**
1. Attempt registration with each email

**Expected Results:**
- Valid emails accepted
- Invalid emails rejected
- Error: "Invalid email address"
- RFC 5322 compliance

---

### Test Scenario 6.4: File Upload Validation
**Priority:** High
**Requirement:** FR-SC-006, FR-FL-001

**Test Steps:**
1. Upload file with valid extension but invalid content (e.g., .jpg file containing executable code)
2. Observe validation

**Expected Results:**
- File content validated (not just extension)
- MIME type checked
- Malicious content detected and rejected
- Magic number validation
- Content-based validation

---

### Test Scenario 6.5: URL Validation and Sanitization
**Priority:** Medium
**Requirement:** FR-SC-006

**Test Steps:**
1. Send message with URL: `javascript:alert('XSS')`
2. Send message with URL: `https://example.com`

**Expected Results:**
- javascript: protocol blocked/sanitized
- https: protocol allowed
- URLs validated before rendering
- Only safe protocols allowed (http, https)

---

## TC-SC-007: CSRF Protection

### Test Scenario 7.1: CSRF Token Validation
**Priority:** High
**Requirement:** FR-SC-007

**Test Steps:**
1. Load form (e.g., profile update)
2. Inspect CSRF token in form
3. Submit form with valid token
4. Submit form without token

**Expected Results:**
- CSRF token generated for form
- Token included as hidden field or header
- Form submission with valid token succeeds
- Form submission without token fails: 403 Forbidden
- Token validation enforced

---

### Test Scenario 7.2: CSRF Token Expiration
**Priority:** Medium
**Requirement:** FR-SC-007

**Test Steps:**
1. Load form and get CSRF token
2. Wait 61 minutes
3. Submit form with expired token

**Expected Results:**
- Token expires after 1 hour
- Submission fails with error
- Error: "CSRF token expired. Refresh and try again."
- User must reload form to get new token

---

### Test Scenario 7.3: CSRF Token Regeneration on Login
**Priority:** High
**Requirement:** FR-SC-007

**Test Steps:**
1. Get CSRF token while logged out
2. Login
3. Attempt to use old CSRF token

**Expected Results:**
- CSRF token regenerated after login
- Old token invalidated
- Form submission with old token fails
- New token required

---

### Test Scenario 7.4: SameSite Cookie Attribute
**Priority:** High
**Requirement:** FR-SC-007

**Test Steps:**
1. Inspect cookies set by application
2. Check SameSite attribute

**Expected Results:**
- Cookies have SameSite=Strict or SameSite=Lax
- Protection against CSRF via cookies
- Modern CSRF protection

---

### Test Scenario 7.5: Double-Submit Cookie Pattern for AJAX
**Priority:** High
**Requirement:** FR-SC-007

**Test Steps:**
1. Make AJAX request (e.g., send message)
2. Inspect request headers and cookies

**Expected Results:**
- CSRF token in both cookie AND request header/body
- Server validates both match
- AJAX requests protected against CSRF
- Tokens must match for request to succeed

---

---

## COMPLIANCE & DATA RETENTION

## TC-CP-001: GDPR Compliance

### Test Scenario 1.1: Privacy Policy Accessibility
**Priority:** High
**Requirement:** FR-CP-001

**Test Steps:**
1. Navigate to website footer
2. Look for "Privacy Policy" link
3. Click link

**Expected Results:**
- Privacy policy publicly accessible
- No login required to view
- Policy clearly written
- Covers: data collection, usage, retention, user rights
- Policy up-to-date

---

### Test Scenario 1.2: User Consent During Registration
**Priority:** High
**Requirement:** FR-CP-001, FR-CP-004

**Test Steps:**
1. Navigate to registration page
2. Observe consent checkboxes
3. Attempt to register without consent

**Expected Results:**
- Consent checkbox for "Terms of Service" (required)
- Consent checkbox for "Privacy Policy" (required)
- Optional consent for "Marketing emails"
- Cannot register without required consents
- Consent recorded with timestamp

---

### Test Scenario 1.3: Data Download (Right to Data Portability)
**Priority:** High
**Requirement:** FR-CP-001, FR-UM-011

**Test Steps:**
1. User requests data export
2. Wait for export completion
3. Download and verify data

**Expected Results:**
- User can download all personal data
- Data in JSON format (machine-readable)
- Export includes: profile, messages, files, call history, contacts
- Data accurate and complete
- Export within 24 hours
- Right to data portability honored

---

### Test Scenario 1.4: Account Deletion (Right to be Forgotten)
**Priority:** High
**Requirement:** FR-CP-001, FR-UM-007

**Test Steps:**
1. User requests account deletion
2. Wait 30 days
3. Verify data deletion

**Expected Results:**
- Account deletion request processed
- Personal data deleted/anonymized within 30 days
- User's messages show "Deleted User" attribution
- Cannot login after deletion
- Right to be forgotten implemented

---

### Test Scenario 1.5: Data Breach Notification
**Priority:** High
**Requirement:** FR-CP-001

**Test Steps:**
1. Simulate data breach detection
2. Check notification process

**Expected Results:**
- Data breach detected and logged
- Affected users notified within 72 hours
- Notification includes: what data affected, when breach occurred, actions taken
- Regulatory authorities notified (if applicable)
- GDPR 72-hour notification requirement met

---

### Test Scenario 1.6: Data Processing Purposes Documented
**Priority:** Medium
**Requirement:** FR-CP-001

**Test Steps:**
1. Review privacy policy
2. Check data processing documentation

**Expected Results:**
- Data processing purposes clearly documented
- Purposes: authentication, messaging, file storage, call history
- Legal basis for processing stated
- User informed of purposes
- GDPR transparency requirements met

---

## TC-CP-002: Data Retention Policy

### Test Scenario 2.1: Message Retention (30 Days)
**Priority:** High
**Requirement:** FR-CP-002, FR-MS-011

**Test Steps:**
1. Send message
2. Wait 29 days, check message exists
3. Wait 31 days, check message exists

**Expected Results:**
- Message available for 30 days
- After 30 days: message auto-deleted
- Retention policy enforced
- Old messages purged automatically

---

### Test Scenario 2.2: Call Logs Retention (90 Days)
**Priority:** High
**Requirement:** FR-CP-002, FR-VC-009

**Test Steps:**
1. Make call
2. Check call history after 85 days
3. Check call history after 95 days

**Expected Results:**
- Call log available for 90 days
- After 90 days: call log deleted
- 90-day retention enforced

---

### Test Scenario 2.3: User Profile Retention
**Priority:** High
**Requirement:** FR-CP-002

**Test Steps:**
1. Check active user profile
2. User deletes account
3. Wait 30 days
4. Verify profile deletion

**Expected Results:**
- Active user profile retained indefinitely
- After account deletion: profile retained for 30 days then deleted
- Deletion per GDPR "right to be forgotten"

---

### Test Scenario 2.4: Audit Logs Retention (1 Year)
**Priority:** High
**Requirement:** FR-CP-002, FR-AM-008

**Test Steps:**
1. Check audit logs from 11 months ago
2. Check audit logs from 13 months ago

**Expected Results:**
- Logs retained for 1 year
- 11-month-old logs available
- 13-month-old logs deleted
- Compliance with retention policy

---

### Test Scenario 2.5: Backup Retention (7 Days Local)
**Priority:** High
**Requirement:** FR-CP-002, NFR-RL-001

**Test Steps:**
1. Check daily backups
2. Verify backup age

**Expected Results:**
- Daily full backups created
- Backups retained for 7 days locally
- 8-day-old backups deleted
- Storage space managed

---

### Test Scenario 2.6: Weekly Remote Backup Retention
**Priority:** Medium
**Requirement:** FR-CP-002

**Test Steps:**
1. Check weekly backup to remote location
2. Verify remote backup storage

**Expected Results:**
- Weekly backups replicated to remote location
- Remote backups retained longer (e.g., 4 weeks)
- Disaster recovery capability
- Geographic redundancy

---

### Test Scenario 2.7: Deleted Data Purged from Backups
**Priority:** High
**Requirement:** FR-CP-002, FR-CP-001

**Test Steps:**
1. User deletes account
2. Wait 30 days
3. Check if data exists in backups

**Expected Results:**
- Deleted data purged from backups within 30 days
- GDPR compliance (right to be forgotten extends to backups)
- Data not recoverable after purge

---

### Test Scenario 2.8: Admin Configurable Retention Policy
**Priority:** Low
**Requirement:** FR-CP-002, FR-AM-009

**Test Steps:**
1. Admin changes message retention from 30 to 60 days
2. Verify policy update

**Expected Results:**
- Retention policy configurable by admin
- New policy takes effect immediately
- Future deletions use new policy
- Flexibility for business needs

---

## TC-CP-003: Audit Trail

### Test Scenario 3.1: Comprehensive Action Logging
**Priority:** High
**Requirement:** FR-CP-003

**Test Steps:**
1. Perform various actions: login, send message, upload file, change password, delete account
2. Check audit logs

**Expected Results:**
- All sensitive actions logged
- Each log entry includes: timestamp, user_id, action, resource_type, resource_id, IP, user_agent, before/after state
- Complete audit trail maintained
- Logs immutable

---

### Test Scenario 3.2: Failed Action Logging
**Priority:** High
**Requirement:** FR-CP-003

**Test Steps:**
1. Perform failed actions: failed login, unauthorized access attempt
2. Check audit logs

**Expected Results:**
- Failed actions also logged
- Includes error details
- Security events tracked
- Failed attempts visible in logs

---

### Test Scenario 3.3: Log Entry Immutability
**Priority:** High
**Requirement:** FR-CP-003

**Test Steps:**
1. Admin attempts to edit or delete audit log entry

**Expected Results:**
- Edit/delete fails
- Error: "Audit logs are immutable"
- Logs cannot be modified
- Integrity maintained
- Tampering prevented

---

### Test Scenario 3.4: Log Integrity Verification
**Priority:** Medium
**Requirement:** FR-CP-003

**Test Steps:**
1. Check log entry checksums
2. Verify log chain integrity

**Expected Results:**
- Log entries have checksums or digital signatures
- Integrity verifiable
- Tampering detectable
- Chain of custody maintained

---

### Test Scenario 3.5: Log Export for Compliance
**Priority:** Medium
**Requirement:** FR-CP-003, FR-AM-008

**Test Steps:**
1. Admin exports audit logs for compliance review
2. Verify export completeness

**Expected Results:**
- Logs exportable in CSV/JSON format
- Export includes all log fields
- Useful for auditors and compliance
- Complete audit trail available

---

### Test Scenario 3.6: Log Retention (1 Year Minimum)
**Priority:** High
**Requirement:** FR-CP-003

**Test Steps:**
1. Check logs from 11 months ago
2. Check logs from 13 months ago

**Expected Results:**
- Logs retained for at least 1 year
- 11-month-old logs available
- 13-month-old logs may be archived or deleted (based on policy)
- Minimum retention met

---

## TC-CP-004: Consent Management

### Test Scenario 4.1: Granular Consent Collection
**Priority:** High
**Requirement:** FR-CP-004

**Test Steps:**
1. Register new account
2. Observe consent options

**Expected Results:**
- Separate checkboxes for:
  - Terms of Service (required)
  - Privacy Policy (required)
  - Marketing emails (optional)
  - Analytics/cookies (optional)
- Granular, purpose-specific consent
- User has choice

---

### Test Scenario 4.2: Consent History Tracking
**Priority:** Medium
**Requirement:** FR-CP-004

**Test Steps:**
1. User provides consent
2. Check database consent_history table

**Expected Results:**
- Consent recorded with timestamp
- Consent type logged
- IP address captured
- User agent logged
- Complete consent audit trail

---

### Test Scenario 4.3: Modify Consent Preferences
**Priority:** Medium
**Requirement:** FR-CP-004

**Test Steps:**
1. User navigates to privacy settings
2. Disable "Marketing emails" consent
3. Save changes

**Expected Results:**
- Consent preferences updated
- Change recorded in consent history
- User no longer receives marketing emails
- Consent withdrawal effective immediately

---

### Test Scenario 4.4: Consent Withdrawal
**Priority:** High
**Requirement:** FR-CP-004, FR-CP-001

**Test Steps:**
1. User withdraws consent for data processing (excluding essential)
2. Observe system behavior

**Expected Results:**
- Consent withdrawal recorded
- Non-essential data processing stopped
- User can still use essential features
- Account deletion offered if all consent withdrawn
- GDPR right to withdraw consent honored

---

### Test Scenario 4.5: No Processing Without Consent
**Priority:** High
**Requirement:** FR-CP-004

**Test Steps:**
1. User has not consented to marketing emails
2. Check if marketing emails sent

**Expected Results:**
- No marketing emails sent to user
- Consent status enforced
- User preferences respected
- No unauthorized data processing

---

### Test Scenario 4.6: Consent Re-Request on Policy Update
**Priority:** Medium
**Requirement:** FR-CP-004

**Test Steps:**
1. Admin updates Terms of Service
2. User logs in
3. Observe re-consent requirement

**Expected Results:**
- User prompted to review updated terms
- Must consent to continue using service
- New consent recorded
- Version tracking
- GDPR compliance maintained
