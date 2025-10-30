# Authentication Test Cases

## TC-UM-001: User Registration

### Test Scenario 1.1: Successful Registration
**Priority:** High
**Requirement:** FR-UM-001

**Preconditions:**
- Application is accessible
- Test email is not registered

**Test Steps:**
1. Navigate to registration page
2. Enter valid username: "testuser123"
3. Enter valid email: "testuser@example.com"
4. Enter password: "Test@1234"
5. Enter confirm password: "Test@1234"
6. Click "Register" button

**Expected Results:**
- Registration successful message displayed
- Verification email sent within 1 minute
- Account created with status='pending'
- User redirected to "awaiting approval" page
- Cannot login until admin approves
- Database record created with correct data

**Postconditions:**
- User exists in database with status='pending'
- Verification email sent to user's inbox

---

### Test Scenario 1.2: Registration with Invalid Email
**Priority:** High
**Requirement:** FR-UM-001

**Test Steps:**
1. Navigate to registration page
2. Enter username: "testuser"
3. Enter invalid email: "notanemail"
4. Enter password: "Test@1234"
5. Enter confirm password: "Test@1234"
6. Click "Register" button

**Expected Results:**
- Registration fails
- Error message: "Invalid email address"
- No user created in database
- No verification email sent

---

### Test Scenario 1.3: Registration with Weak Password
**Priority:** High
**Requirement:** FR-UM-001

**Test Data:**
- "test" (too short)
- "testtest" (no uppercase, number, special char)
- "TESTTEST" (no lowercase, number, special char)
- "Testtest" (no number, special char)
- "Test1234" (no special char)

**Test Steps:**
1. Navigate to registration page
2. Enter valid username and email
3. Enter weak password from test data
4. Click "Register" button

**Expected Results:**
- Registration fails
- Error message: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, 1 special character"
- No user created

---

### Test Scenario 1.4: Registration with Duplicate Email
**Priority:** High
**Requirement:** FR-UM-001

**Preconditions:**
- User with email "existing@example.com" already exists

**Test Steps:**
1. Navigate to registration page
2. Enter username: "newuser"
3. Enter email: "existing@example.com"
4. Enter valid password
5. Click "Register" button

**Expected Results:**
- Registration fails
- Error message: "Email address already registered"
- No duplicate user created

---

### Test Scenario 1.5: Registration with Mismatched Passwords
**Priority:** Medium
**Requirement:** FR-UM-001

**Test Steps:**
1. Navigate to registration page
2. Enter valid username and email
3. Enter password: "Test@1234"
4. Enter confirm password: "Test@5678"
5. Click "Register" button

**Expected Results:**
- Registration fails
- Error message: "Passwords do not match"
- No user created

---

### Test Scenario 1.6: Registration with SQL Injection Attempt
**Priority:** High
**Requirement:** FR-SC-006

**Test Steps:**
1. Navigate to registration page
2. Enter username: "admin'--"
3. Enter email: "test@example.com'; DROP TABLE users;--"
4. Enter valid password
5. Click "Register" button

**Expected Results:**
- Input sanitized
- Registration either succeeds with sanitized data or fails with validation error
- No SQL injection executed
- Database tables intact

---

### Test Scenario 1.7: Registration with XSS Attempt
**Priority:** High
**Requirement:** FR-SC-006

**Test Steps:**
1. Navigate to registration page
2. Enter username: "<script>alert('XSS')</script>"
3. Enter valid email and password
4. Click "Register" button

**Expected Results:**
- Input sanitized/escaped
- Script tags not executed
- Username stored as plain text or rejected
- No XSS vulnerability

---

## TC-UM-002: Email Verification

### Test Scenario 2.1: Successful Email Verification
**Priority:** High
**Requirement:** FR-UM-002

**Preconditions:**
- User registered with unverified email
- Verification email received

**Test Steps:**
1. Open verification email
2. Click verification link
3. Observe result

**Expected Results:**
- Redirected to success page
- Message: "Email verified successfully"
- User record updated with email_verified=true
- Verification token invalidated

---

### Test Scenario 2.2: Verification with Expired Link
**Priority:** High
**Requirement:** FR-UM-002

**Preconditions:**
- User registered 25+ hours ago
- Verification link not yet clicked

**Test Steps:**
1. Click expired verification link
2. Observe result

**Expected Results:**
- Error page displayed
- Message: "Verification link expired"
- Option to request new verification email
- User email still unverified

---

### Test Scenario 2.3: Request New Verification Email
**Priority:** Medium
**Requirement:** FR-UM-002

**Preconditions:**
- User has unverified email

**Test Steps:**
1. Navigate to "Resend verification email" page
2. Enter registered email address
3. Click "Resend" button

**Expected Results:**
- New verification email sent within 1 minute
- Old verification link invalidated
- Success message displayed
- New link valid for 24 hours

---

### Test Scenario 2.4: Verification Link Reuse
**Priority:** Medium
**Requirement:** FR-UM-002

**Preconditions:**
- User already verified email

**Test Steps:**
1. Click same verification link again
2. Observe result

**Expected Results:**
- Error or info message: "Email already verified"
- No duplicate verification
- User redirected to login page

---

## TC-UM-003: User Login

### Test Scenario 3.1: Successful Login
**Priority:** High
**Requirement:** FR-UM-003

**Preconditions:**
- User exists with status='active'
- Email verified

**Test Steps:**
1. Navigate to login page
2. Enter email: "active@example.com"
3. Enter correct password
4. Click "Login" button

**Expected Results:**
- Login successful
- JWT access token received (24h expiry)
- JWT refresh token received (7d expiry)
- User redirected to dashboard
- Session created in database
- WebSocket connection established
- User status set to 'online'

---

### Test Scenario 3.2: Login with Incorrect Password
**Priority:** High
**Requirement:** FR-UM-003

**Test Steps:**
1. Navigate to login page
2. Enter valid email
3. Enter incorrect password
4. Click "Login" button

**Expected Results:**
- Login fails
- Error message: "Invalid credentials"
- Failed attempt logged with IP address
- No token issued
- No session created

---

### Test Scenario 3.3: Login with Non-Existent Email
**Priority:** Medium
**Requirement:** FR-UM-003

**Test Steps:**
1. Navigate to login page
2. Enter email: "nonexistent@example.com"
3. Enter any password
4. Click "Login" button

**Expected Results:**
- Login fails
- Error message: "Invalid credentials" (same as wrong password for security)
- No token issued

---

### Test Scenario 3.4: Account Lockout After Failed Attempts
**Priority:** High
**Requirement:** FR-UM-003

**Test Steps:**
1. Attempt login with wrong password (5 times within 15 minutes)
2. Attempt 6th login with correct password
3. Wait 30 minutes
4. Attempt login with correct password

**Expected Results:**
- After 5 failed attempts: account locked
- 6th attempt fails with message: "Account locked due to too many failed attempts. Try again in 30 minutes"
- After 30 minutes: account auto-unlocked
- Login succeeds after unlock

---

### Test Scenario 3.5: Login with Pending Account
**Priority:** High
**Requirement:** FR-UM-003

**Preconditions:**
- User exists with status='pending' (awaiting admin approval)

**Test Steps:**
1. Navigate to login page
2. Enter valid credentials for pending account
3. Click "Login" button

**Expected Results:**
- Login fails
- Error message: "Account pending admin approval"
- No token issued

---

### Test Scenario 3.6: Login with Inactive Account
**Priority:** High
**Requirement:** FR-UM-003

**Preconditions:**
- User account deactivated by admin

**Test Steps:**
1. Navigate to login page
2. Enter valid credentials for inactive account
3. Click "Login" button

**Expected Results:**
- Login fails
- Error message: "Account has been deactivated. Contact support."
- No token issued

---

### Test Scenario 3.7: Login with 2FA Enabled
**Priority:** High
**Requirement:** FR-UM-003, FR-UM-008

**Preconditions:**
- User has 2FA enabled

**Test Steps:**
1. Navigate to login page
2. Enter valid credentials
3. Click "Login" button
4. Enter 6-digit TOTP code from authenticator app
5. Submit 2FA code

**Expected Results:**
- After step 3: redirected to 2FA verification page
- After step 5 with correct code: login successful, tokens issued
- With incorrect code: login fails, error displayed
- Failed 2FA attempts logged

---

### Test Scenario 3.8: Session Timeout
**Priority:** Medium
**Requirement:** FR-UM-003, FR-SC-002

**Preconditions:**
- User logged in

**Test Steps:**
1. Login successfully
2. Remain inactive for 30 minutes
3. Attempt to perform any action requiring authentication

**Expected Results:**
- After 30 minutes: session expires
- Action fails with "Session expired"
- User redirected to login page
- Session removed from database

---

### Test Scenario 3.9: JWT Token Expiration
**Priority:** High
**Requirement:** FR-SC-002

**Preconditions:**
- User logged in
- Access token expired (24h+ elapsed)

**Test Steps:**
1. Make API request with expired access token
2. Observe response

**Expected Results:**
- Request fails with 401 Unauthorized
- Response includes "Token expired"
- Client automatically requests new token using refresh token
- New access token issued if refresh token valid

---

### Test Scenario 3.10: Concurrent Session Limit
**Priority:** Medium
**Requirement:** FR-SC-002

**Test Steps:**
1. Login from Device 1 (browser/device)
2. Login from Device 2
3. Login from Device 3
4. Login from Device 4
5. Login from Device 5
6. Login from Device 6 (6th concurrent session)

**Expected Results:**
- First 5 sessions created successfully
- 6th login either succeeds and terminates oldest session OR fails with "Maximum concurrent sessions reached"
- User can view all active sessions
- User can manually revoke sessions

---

## TC-UM-004: User Logout

### Test Scenario 4.1: Successful Logout
**Priority:** Medium
**Requirement:** FR-UM-004

**Preconditions:**
- User logged in

**Test Steps:**
1. Click "Logout" button
2. Observe result

**Expected Results:**
- JWT tokens invalidated
- Session removed from database/Redis
- WebSocket connection closed
- User status set to 'offline'
- User redirected to login page
- Subsequent API requests with old token fail

---

### Test Scenario 4.2: Logout from Multiple Devices
**Priority:** Medium
**Requirement:** FR-UM-004

**Preconditions:**
- User logged in on 3 devices

**Test Steps:**
1. On Device 1, navigate to sessions page
2. Click "Logout All Devices" button

**Expected Results:**
- All sessions terminated
- User logged out on all 3 devices
- All WebSocket connections closed
- User redirected to login on all devices

---

## TC-UM-005: Password Reset

### Test Scenario 5.1: Successful Password Reset Request
**Priority:** High
**Requirement:** FR-UM-005

**Test Steps:**
1. Navigate to login page
2. Click "Forgot Password?" link
3. Enter registered email address
4. Click "Send Reset Link" button

**Expected Results:**
- Success message: "Password reset link sent to your email"
- Reset email sent within 1 minute
- Reset token valid for 1 hour
- Reset link includes secure token

---

### Test Scenario 5.2: Password Reset with Non-Existent Email
**Priority:** Medium
**Requirement:** FR-UM-005

**Test Steps:**
1. Navigate to password reset page
2. Enter non-existent email
3. Click "Send Reset Link" button

**Expected Results:**
- Same success message displayed (security: don't reveal if email exists)
- No email sent
- No reset token created

---

### Test Scenario 5.3: Complete Password Reset
**Priority:** High
**Requirement:** FR-UM-005

**Preconditions:**
- Password reset link received

**Test Steps:**
1. Click reset link in email
2. Enter new password: "NewPass@123"
3. Enter confirm password: "NewPass@123"
4. Click "Reset Password" button
5. Attempt login with old password
6. Attempt login with new password

**Expected Results:**
- Password reset successful
- Success message displayed
- Old password no longer works
- New password works for login
- Notification email sent to user
- Reset token invalidated

---

### Test Scenario 5.4: Password Reset with Expired Token
**Priority:** Medium
**Requirement:** FR-UM-005

**Preconditions:**
- Reset link issued 61+ minutes ago

**Test Steps:**
1. Click expired reset link
2. Observe result

**Expected Results:**
- Error page displayed
- Message: "Reset link expired"
- Option to request new reset link
- Password remains unchanged

---

### Test Scenario 5.5: Password History Prevention
**Priority:** Medium
**Requirement:** FR-UM-005

**Preconditions:**
- User has 3 previous passwords in history

**Test Steps:**
1. Initiate password reset
2. Attempt to set password to one of last 3 passwords
3. Click "Reset Password" button

**Expected Results:**
- Reset fails
- Error message: "Cannot reuse recent passwords. Choose a different password."
- Password remains unchanged

---

### Test Scenario 5.6: Password Reset with Weak Password
**Priority:** High
**Requirement:** FR-UM-005, FR-SC-001

**Test Steps:**
1. Click reset link
2. Enter weak password: "test"
3. Click "Reset Password" button

**Expected Results:**
- Reset fails
- Error message about password complexity requirements
- Password remains unchanged

---

## TC-UM-006: Profile Management

### Test Scenario 6.1: View Profile
**Priority:** Medium
**Requirement:** FR-UM-006

**Preconditions:**
- User logged in

**Test Steps:**
1. Navigate to profile page
2. Observe displayed information

**Expected Results:**
- Profile displays: username, email, profile picture, bio, status, created date
- All information accurate
- Profile picture displayed (or default avatar)
- Online status indicator shown

---

### Test Scenario 6.2: Update Username
**Priority:** Medium
**Requirement:** FR-UM-006

**Test Steps:**
1. Navigate to profile edit page
2. Change username to "newusername123" (3-50 chars)
3. Click "Save" button

**Expected Results:**
- Username updated successfully
- Success message displayed
- New username displayed throughout app
- Changes saved in database
- Username uniqueness validated

---

### Test Scenario 6.3: Update Username to Existing Username
**Priority:** Medium
**Requirement:** FR-UM-006

**Preconditions:**
- Another user with username "existinguser" exists

**Test Steps:**
1. Navigate to profile edit page
2. Change username to "existinguser"
3. Click "Save" button

**Expected Results:**
- Update fails
- Error message: "Username already taken"
- Username remains unchanged

---

### Test Scenario 6.4: Update Profile Picture
**Priority:** Medium
**Requirement:** FR-UM-006

**Test Steps:**
1. Navigate to profile edit page
2. Click "Upload Profile Picture"
3. Select valid image file (jpg, png, gif, <5MB)
4. Click "Save" button

**Expected Results:**
- Image uploaded successfully
- Image auto-resized to 200x200px
- New profile picture displayed
- Old picture removed from storage
- Profile picture visible to other users

---

### Test Scenario 6.5: Update Profile Picture with Invalid File
**Priority:** Medium
**Requirement:** FR-UM-006

**Test Data:**
- File >5MB
- Unsupported format (.exe, .txt)

**Test Steps:**
1. Navigate to profile edit page
2. Attempt to upload invalid file
3. Click "Save" button

**Expected Results:**
- Upload fails
- Error message: "Invalid file. Max 5MB, formats: jpg, png, gif"
- Profile picture unchanged

---

### Test Scenario 6.6: Update Bio
**Priority:** Low
**Requirement:** FR-UM-006

**Test Steps:**
1. Navigate to profile edit page
2. Enter bio text (up to 500 characters)
3. Click "Save" button

**Expected Results:**
- Bio updated successfully
- Bio displayed on profile
- Character counter shows remaining chars
- Bio visible to other users

---

### Test Scenario 6.7: Update Bio Exceeding Limit
**Priority:** Low
**Requirement:** FR-UM-006

**Test Steps:**
1. Navigate to profile edit page
2. Enter bio text >500 characters
3. Attempt to save

**Expected Results:**
- Character limit enforced
- Save button disabled OR error message displayed
- Bio not updated

---

### Test Scenario 6.8: Update Email Requires Re-verification
**Priority:** Medium
**Requirement:** FR-UM-006

**Test Steps:**
1. Navigate to profile edit page
2. Change email to "newemail@example.com"
3. Click "Save" button

**Expected Results:**
- Email change initiated
- Verification email sent to new address
- Old email still active until new email verified
- User must verify new email to complete change
- Notification sent to old email about change

---

## TC-UM-007: Account Deletion (GDPR)

### Test Scenario 7.1: Request Account Deletion
**Priority:** Medium
**Requirement:** FR-UM-007, FR-CP-001

**Preconditions:**
- User logged in

**Test Steps:**
1. Navigate to account settings
2. Click "Delete Account" button
3. Read warning dialog about permanent data loss
4. Click "Confirm" button
5. Re-enter password for authentication
6. Click "Delete My Account" button

**Expected Results:**
- Confirmation dialog warns of data loss
- Password re-authentication required
- Account marked for deletion (soft delete)
- User logged out immediately
- Deletion email sent
- Personal data anonymized/deleted within 30 days
- User's messages show "Deleted User" attribution
- Deletion logged in audit trail

---

### Test Scenario 7.2: Cancel Account Deletion
**Priority:** Low
**Requirement:** FR-UM-007

**Test Steps:**
1. Navigate to account settings
2. Click "Delete Account" button
3. Click "Cancel" in confirmation dialog

**Expected Results:**
- Dialog closed
- Account deletion cancelled
- Account remains active
- No changes made

---

### Test Scenario 7.3: Account Deletion with Incorrect Password
**Priority:** Medium
**Requirement:** FR-UM-007

**Test Steps:**
1. Initiate account deletion
2. Enter incorrect password in re-authentication
3. Click "Delete My Account" button

**Expected Results:**
- Deletion fails
- Error message: "Incorrect password"
- Account remains active
- No deletion initiated

---

## TC-UM-008: Two-Factor Authentication (2FA)

### Test Scenario 8.1: Enable 2FA
**Priority:** Medium
**Requirement:** FR-UM-008

**Test Steps:**
1. Navigate to security settings
2. Click "Enable 2FA" button
3. Scan QR code with authenticator app
4. Enter 6-digit verification code
5. Save 10 backup codes
6. Click "Confirm" button

**Expected Results:**
- QR code displayed
- 10 single-use backup codes generated and displayed
- After entering correct code: 2FA enabled
- 2FA status saved in database
- Success message displayed
- User prompted to download backup codes

---

### Test Scenario 8.2: Enable 2FA with Incorrect Code
**Priority:** Medium
**Requirement:** FR-UM-008

**Test Steps:**
1. Initiate 2FA setup
2. Scan QR code
3. Enter incorrect 6-digit code
4. Click "Confirm" button

**Expected Results:**
- Setup fails
- Error message: "Invalid verification code"
- 2FA not enabled
- User can retry

---

### Test Scenario 8.3: Login with 2FA Using Authenticator Code
**Priority:** High
**Requirement:** FR-UM-008

**Preconditions:**
- User has 2FA enabled

**Test Steps:**
1. Enter email and password on login page
2. Click "Login" button
3. Enter 6-digit code from authenticator app
4. Submit 2FA code

**Expected Results:**
- After password: redirected to 2FA verification page
- With correct code: login successful, tokens issued
- With incorrect code: login fails, can retry
- Failed 2FA attempts logged

---

### Test Scenario 8.4: Login with 2FA Using Backup Code
**Priority:** Medium
**Requirement:** FR-UM-008

**Preconditions:**
- User has 2FA enabled
- User has backup codes

**Test Steps:**
1. Complete password authentication
2. Click "Use Backup Code" link
3. Enter one of the 10 backup codes
4. Submit code

**Expected Results:**
- Login successful with valid backup code
- Backup code marked as used (cannot reuse)
- User warned to generate new backup codes if running low
- Login successful

---

### Test Scenario 8.5: Disable 2FA
**Priority:** Medium
**Requirement:** FR-UM-008

**Test Steps:**
1. Navigate to security settings
2. Click "Disable 2FA" button
3. Enter current password
4. Confirm disable action

**Expected Results:**
- Password verification required
- 2FA disabled successfully
- 2FA setting updated in database
- Backup codes invalidated
- Success message displayed
- Future logins don't require 2FA

---

### Test Scenario 8.6: 2FA Brute Force Protection
**Priority:** High
**Requirement:** FR-UM-008, FR-SC-003

**Test Steps:**
1. Complete password authentication
2. Enter incorrect 2FA code 5 times
3. Attempt 6th incorrect code

**Expected Results:**
- After 5 failed attempts: account temporarily locked or rate limited
- Further attempts blocked for period of time
- User notified via email of suspicious activity
- All failed attempts logged with IP address

---

## TC-UM-009: User Status Management

### Test Scenario 9.1: Auto-Status on Login
**Priority:** Medium
**Requirement:** FR-UM-009

**Test Steps:**
1. Login to application
2. Observe user status

**Expected Results:**
- Status automatically set to 'online'
- Status broadcast to user's contacts
- Last seen timestamp updated
- Online indicator visible to contacts

---

### Test Scenario 9.2: Auto-Status on Inactivity
**Priority:** Medium
**Requirement:** FR-UM-009

**Test Steps:**
1. Login to application
2. Remain inactive for 5 minutes
3. Observe status change

**Expected Results:**
- After 5 minutes: status changes to 'away'
- Status broadcast to contacts
- Away indicator visible to contacts
- Last seen timestamp updated

---

### Test Scenario 9.3: Manual Status Change
**Priority:** Low
**Requirement:** FR-UM-009

**Test Steps:**
1. Click on status dropdown
2. Select "Busy" status
3. Observe result

**Expected Results:**
- Status changed to 'busy'
- Status immediately broadcast to contacts
- Busy indicator visible to contacts
- Last seen timestamp updated

---

### Test Scenario 9.4: Custom Status Message
**Priority:** Low
**Requirement:** FR-UM-009

**Test Steps:**
1. Click on status section
2. Enter custom status: "In a meeting" (max 100 chars)
3. Save status

**Expected Results:**
- Custom status saved
- Status message visible to contacts
- Message limited to 100 characters
- Status message broadcast in real-time

---

### Test Scenario 9.5: Status on Logout/Disconnect
**Priority:** Medium
**Requirement:** FR-UM-009

**Test Steps:**
1. Login to application
2. Logout or close browser/app
3. Observe status from another account

**Expected Results:**
- Status immediately set to 'offline'
- Last seen timestamp updated to current time
- Offline status broadcast to contacts
- Contacts see "Last seen at [timestamp]"

---

## TC-UM-010: User Search

### Test Scenario 10.1: Search by Username
**Priority:** Medium
**Requirement:** FR-UM-010

**Test Steps:**
1. Navigate to "Add Contact" or "Search Users" page
2. Enter search query: "john" (partial match)
3. Click "Search" button

**Expected Results:**
- Results show users with "john" in username
- Case-insensitive search
- Results limited to 20 per page
- Each result shows: username, profile picture, online status
- Pagination shown if >20 results
- Only active users displayed

---

### Test Scenario 10.2: Search by Email
**Priority:** Medium
**Requirement:** FR-UM-010

**Test Steps:**
1. Navigate to search page
2. Enter search query: "john@example"
3. Click "Search" button

**Expected Results:**
- Results show users with matching email
- Partial email match supported
- Search results formatted same as username search

---

### Test Scenario 10.3: Search with Minimum Character Requirement
**Priority:** Low
**Requirement:** FR-UM-010

**Test Steps:**
1. Navigate to search page
2. Enter 1 character: "j"
3. Attempt to search

**Expected Results:**
- Search button disabled OR error message shown
- Message: "Minimum 2 characters required"
- No search performed

---

### Test Scenario 10.4: Search Excludes Blocked Users
**Priority:** Medium
**Requirement:** FR-UM-010, FR-CT-003

**Preconditions:**
- Current user has blocked user "blockeduser"

**Test Steps:**
1. Search for "blockeduser"
2. Observe results

**Expected Results:**
- Blocked users excluded from results
- No indication that user exists
- Search returns no results or omits blocked user

---

### Test Scenario 10.5: Search Pagination
**Priority:** Low
**Requirement:** FR-UM-010

**Preconditions:**
- More than 20 users match search criteria

**Test Steps:**
1. Perform search that returns >20 results
2. Navigate to page 2
3. Observe results

**Expected Results:**
- First page shows 20 results
- Pagination controls visible
- Page 2 shows next 20 results
- Total result count displayed
- Page navigation functional

---

## TC-UM-011: Data Export (GDPR)

### Test Scenario 11.1: Request Data Export
**Priority:** Medium
**Requirement:** FR-UM-011, FR-CP-001

**Test Steps:**
1. Navigate to privacy settings
2. Click "Download My Data" button
3. Confirm request
4. Wait for export completion

**Expected Results:**
- Export request confirmed
- Export generated within 24 hours
- Email sent with download link
- Export includes: profile, messages, files, call history, contacts
- Data provided in JSON format
- Export file encrypted with user password
- Download link valid for 7 days
- Export request logged in audit trail

---

### Test Scenario 11.2: Download Exported Data
**Priority:** Medium
**Requirement:** FR-UM-011

**Preconditions:**
- Data export completed
- Download link received via email

**Test Steps:**
1. Click download link in email
2. Enter account password to decrypt
3. Download file
4. Extract and verify contents

**Expected Results:**
- Password required to decrypt
- File downloads successfully
- JSON file contains all user data
- Data is complete and accurate
- File includes: profile.json, messages.json, files.json, calls.json, contacts.json

---

### Test Scenario 11.3: Expired Export Link
**Priority:** Low
**Requirement:** FR-UM-011

**Preconditions:**
- Export link issued 8+ days ago

**Test Steps:**
1. Click expired download link
2. Observe result

**Expected Results:**
- Error message: "Download link expired"
- Option to request new export
- Old export file deleted from server

---

### Test Scenario 11.4: Multiple Export Requests
**Priority:** Low
**Requirement:** FR-UM-011

**Test Steps:**
1. Request data export
2. Immediately request another export
3. Observe result

**Expected Results:**
- Second request either queued OR replaces first request
- User notified that export is already in progress
- Only one active export per user at a time
- All requests logged
