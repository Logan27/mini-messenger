# Admin & Contact Management Test Cases

## CONTACT MANAGEMENT

## TC-CT-001: Add Contact

### Test Scenario 1.1: Add Contact Successfully
**Priority:** Medium
**Requirement:** FR-CT-001

**Test Steps:**
1. User A navigates to "Add Contact" page
2. Search for User B by username or email
3. Select User B from search results
4. Click "Add Contact" button

**Expected Results:**
- User B added to User A's contacts list
- Contact status set to 'active'
- User B appears in contacts list immediately
- No confirmation required from User B (direct add)
- Add event logged in audit trail
- Contact count updated

---

### Test Scenario 1.2: Add Duplicate Contact
**Priority:** Medium
**Requirement:** FR-CT-001

**Preconditions:**
- User B already in User A's contacts

**Test Steps:**
1. Attempt to add User B again

**Expected Results:**
- Add fails or disabled
- Message: "User already in contacts"
- Duplicate prevention enforced
- No duplicate entry created

---

### Test Scenario 1.3: Contact Limit (100 Contacts)
**Priority:** Medium
**Requirement:** FR-CT-001

**Preconditions:**
- User A has 100 contacts

**Test Steps:**
1. Attempt to add 101st contact

**Expected Results:**
- Add fails
- Error: "Maximum 100 contacts allowed"
- Contact limit enforced
- Cannot exceed limit

---

### Test Scenario 1.4: Add Self as Contact
**Priority:** Low
**Requirement:** FR-CT-001

**Test Steps:**
1. Search for own username
2. Attempt to add self

**Expected Results:**
- Cannot add self
- Option disabled or validation error
- Message: "Cannot add yourself as contact"

---

## TC-CT-002: Remove Contact

### Test Scenario 2.1: Remove Contact Successfully
**Priority:** Medium
**Requirement:** FR-CT-002

**Test Steps:**
1. User A opens contacts list
2. Select User B
3. Click "Remove Contact"
4. Confirm removal in dialog

**Expected Results:**
- Confirmation dialog shown: "Remove [User B] from contacts?"
- User B removed from User A's contacts list
- Contact removed from both users' lists (symmetric)
- Existing conversation history preserved
- Can still send messages (if not blocked)
- Removal logged in audit trail

---

### Test Scenario 2.2: Cancel Contact Removal
**Priority:** Low
**Requirement:** FR-CT-002

**Test Steps:**
1. Initiate contact removal
2. Click "Cancel" in confirmation dialog

**Expected Results:**
- Removal cancelled
- Contact remains in list
- No changes made

---

## TC-CT-003: Block Contact

### Test Scenario 3.1: Block Contact Successfully
**Priority:** Medium
**Requirement:** FR-CT-003

**Test Steps:**
1. User A opens User B's profile
2. Click "Block User" button
3. Confirm block action

**Expected Results:**
- User B blocked by User A
- Block status stored in contacts table
- User B cannot send messages to User A
- User B cannot initiate calls to User A
- User A appears offline to User B
- User B excluded from User A's search results
- Block action logged in audit trail
- User A can still see past conversation history

---

### Test Scenario 3.2: Blocked User Attempts to Send Message
**Priority:** High
**Requirement:** FR-CT-003

**Preconditions:**
- User A has blocked User B

**Test Steps:**
1. User B attempts to send message to User A
2. Observe result

**Expected Results:**
- Message not delivered
- Error: "Message could not be sent" (no indication of block to User B)
- Message not stored
- User A does not receive message
- Privacy maintained

---

### Test Scenario 3.3: Blocked User Attempts to Call
**Priority:** High
**Requirement:** FR-CT-003

**Test Steps:**
1. User B attempts to call User A (who blocked them)
2. Observe result

**Expected Results:**
- Call fails
- Error: "User is unavailable"
- Call not initiated
- User A not notified
- No indication to User B that they are blocked

---

### Test Scenario 3.4: Blocked User in Search Results
**Priority:** Medium
**Requirement:** FR-CT-003

**Test Steps:**
1. User A searches for all users
2. Observe if User B (blocked) appears

**Expected Results:**
- User B excluded from search results
- User A cannot find User B via search
- Privacy enforced

---

### Test Scenario 3.5: Online Status for Blocked User
**Priority:** Medium
**Requirement:** FR-CT-003

**Test Steps:**
1. User A blocks User B
2. User B checks User A's online status

**Expected Results:**
- User A appears offline to User B
- Status always shows "offline"
- Last seen not updated
- Privacy protected

---

## TC-CT-004: Unblock Contact

### Test Scenario 4.1: Unblock Contact Successfully
**Priority:** Medium
**Requirement:** FR-CT-004

**Test Steps:**
1. User A navigates to blocked contacts list
2. Select User B
3. Click "Unblock" button
4. Confirm unblock action

**Expected Results:**
- Confirmation dialog shown
- User B unblocked
- Contact status changed to 'active'
- Normal communication restored
- User B can send messages/calls again
- User A visible to User B again
- Unblock logged in audit trail

---

### Test Scenario 4.2: Automatic Contact Re-Add on Unblock
**Priority:** Low
**Requirement:** FR-CT-004

**Test Steps:**
1. Unblock previously blocked user
2. Check contacts list

**Expected Results:**
- User not automatically added to contacts
- Must manually add as contact again (if desired)
- Unblock ≠ automatic contact add

---

## TC-CT-005: View Contacts List

### Test Scenario 5.1: View Contacts List
**Priority:** Medium
**Requirement:** FR-CT-005

**Test Steps:**
1. Navigate to contacts page
2. Observe displayed information

**Expected Results:**
- Contacts sorted alphabetically by username
- Online status indicator shown (green/yellow/gray)
- Profile picture displayed
- Last seen timestamp for offline contacts
- Separate sections: Online, Away, Offline
- Contact count displayed
- Smooth scrolling

---

### Test Scenario 5.2: Search/Filter Contacts
**Priority:** Low
**Requirement:** FR-CT-005

**Test Steps:**
1. Open contacts list
2. Type in search box: "john"
3. Observe results

**Expected Results:**
- Contacts filtered to match "john"
- Real-time filtering as user types
- Case-insensitive search
- Search across username
- Clear search button available

---

### Test Scenario 5.3: Contact Status Updates Real-Time
**Priority:** Medium
**Requirement:** FR-CT-005, FR-UM-009

**Test Steps:**
1. User A viewing contacts list
2. User B (contact) goes offline
3. Observe User A's contacts list

**Expected Results:**
- User B's status updates in real-time (via WebSocket)
- Status indicator changes from online to offline
- Last seen timestamp appears
- Real-time synchronization

---

---

## ADMIN FEATURES

## TC-AM-001: Approve User Registration

### Test Scenario 1.1: View Pending Registrations
**Priority:** High
**Requirement:** FR-AM-001

**Preconditions:**
- Admin logged in
- 3 users registered with status='pending'

**Test Steps:**
1. Admin navigates to "Pending Registrations" page
2. Observe list

**Expected Results:**
- List shows all pending registrations
- Each entry displays: username, email, registration date
- Entries sorted by registration date (newest first)
- Approve/Reject buttons available for each
- Count of pending registrations displayed

---

### Test Scenario 1.2: Approve User Registration
**Priority:** High
**Requirement:** FR-AM-001

**Test Steps:**
1. Admin reviews pending user "testuser@example.com"
2. Click "Approve" button
3. Confirm approval

**Expected Results:**
- User status changed to 'active'
- Welcome email sent to user within 1 minute
- User can now login
- User appears in active users list
- Approval logged in audit trail with admin ID and timestamp
- User removed from pending list

---

### Test Scenario 1.3: Bulk Approve Multiple Users
**Priority:** Medium
**Requirement:** FR-AM-001

**Test Steps:**
1. Select 5 pending users (checkboxes)
2. Click "Approve Selected" button
3. Confirm bulk approval

**Expected Results:**
- All 5 users approved simultaneously
- All users set to 'active'
- Welcome emails sent to all 5
- Bulk approval logged
- Efficient processing

---

## TC-AM-002: Reject User Registration

### Test Scenario 2.1: Reject Registration with Reason
**Priority:** High
**Requirement:** FR-AM-002

**Test Steps:**
1. Admin reviews pending user
2. Click "Reject" button
3. Enter rejection reason: "Invalid email domain"
4. Confirm rejection

**Expected Results:**
- User account marked for deletion
- Rejection email sent with reason included
- Email content: "Your registration was rejected. Reason: Invalid email domain"
- User data removed within 24 hours
- Rejection logged with reason in audit trail
- User disappears from pending list

---

### Test Scenario 2.2: Reject Without Reason
**Priority:** Medium
**Requirement:** FR-AM-002

**Test Steps:**
1. Admin clicks "Reject"
2. Leave reason field empty
3. Attempt to confirm

**Expected Results:**
- Rejection reason optional OR required (based on business rule)
- If optional: rejection proceeds with "No reason provided"
- If required: validation error shown
- Configurable behavior

---

## TC-AM-003: Deactivate User Account

### Test Scenario 3.1: Deactivate Active User
**Priority:** High
**Requirement:** FR-AM-003

**Test Steps:**
1. Admin navigates to active users list
2. Select user "activeuser@example.com"
3. Click "Deactivate Account" button
4. Enter reason: "Terms of service violation"
5. Confirm deactivation

**Expected Results:**
- Deactivation reason required
- User status changed to 'inactive'
- User immediately logged out (session terminated)
- User cannot login while inactive
- Deactivation email sent to user with reason
- Deactivation logged with reason and admin ID
- User's data preserved

---

### Test Scenario 3.2: Deactivate Currently Logged In User
**Priority:** High
**Requirement:** FR-AM-003

**Test Steps:**
1. User logged in and active
2. Admin deactivates user
3. Observe user's session

**Expected Results:**
- User session terminated immediately
- WebSocket connection closed
- User redirected to login page
- Login attempt fails: "Account has been deactivated"
- Real-time enforcement

---

### Test Scenario 3.3: Attempt to Deactivate Admin Account
**Priority:** High
**Requirement:** FR-AM-003

**Test Steps:**
1. Admin attempts to deactivate another admin or self

**Expected Results:**
- Deactivation blocked
- Error: "Cannot deactivate admin accounts"
- Only non-admin users can be deactivated
- Protection for admin accounts
- Must remove admin role first (if needed)

---

## TC-AM-004: Reactivate User Account

### Test Scenario 4.1: Reactivate Inactive User
**Priority:** Medium
**Requirement:** FR-AM-004

**Test Steps:**
1. Admin navigates to inactive users list
2. Select user "inactiveuser@example.com"
3. Click "Reactivate Account" button
4. Confirm reactivation

**Expected Results:**
- User status changed to 'active'
- User can login again
- Reactivation email sent to user
- Reactivation logged in audit trail
- User's data and messages preserved
- User appears in active users list

---

### Test Scenario 4.2: User Login After Reactivation
**Priority:** Medium
**Requirement:** FR-AM-004

**Test Steps:**
1. Admin reactivates user
2. User attempts login

**Expected Results:**
- Login succeeds
- User has access to all previous data
- Messages, contacts, files intact
- No data loss during inactive period

---

## TC-AM-005: View System Statistics

### Test Scenario 5.1: Admin Dashboard Overview
**Priority:** Medium
**Requirement:** FR-AM-005

**Test Steps:**
1. Admin navigates to dashboard
2. Observe displayed statistics

**Expected Results:**
- Total users count displayed
- Active users count (currently online)
- Pending registrations count
- Storage usage: Total GB used, breakdown by user, by file type
- Daily/weekly/monthly activity trends (charts)
- User growth chart (registration over time)
- Top active users list (by message count/activity)
- Active calls count
- System health indicators

---

### Test Scenario 5.2: Storage Usage Breakdown
**Priority:** Medium
**Requirement:** FR-AM-005

**Test Steps:**
1. View storage statistics section
2. Observe breakdown

**Expected Results:**
- Total storage: 45GB / 160GB
- By file type: Images (20GB), Documents (15GB), Videos (10GB)
- By user: Top 10 users by storage consumption
- Charts/graphs for visualization
- Storage growth trend
- Alert if approaching 80% capacity (128GB)

---

### Test Scenario 5.3: Export Statistics
**Priority:** Low
**Requirement:** FR-AM-005

**Test Steps:**
1. Click "Export Statistics" button
2. Select format: CSV
3. Download file

**Expected Results:**
- Statistics exported to CSV file
- File includes: users, messages, calls, storage data
- File downloadable
- Data accurate and complete
- Also available in PDF format

---

## TC-AM-006: Monitor System Performance

### Test Scenario 6.1: Real-Time Performance Metrics
**Priority:** Medium
**Requirement:** FR-AM-006

**Test Steps:**
1. Admin navigates to performance monitoring page
2. Observe real-time metrics

**Expected Results:**
- CPU usage: 45%
- RAM usage: 6GB / 8GB
- Disk usage: 45GB / 160GB
- Network bandwidth: In/Out Mbps
- Database connection pool: Active/Idle connections
- Message delivery latency: avg, p95, p99
- Active WebSocket connections: 25
- Call quality metrics: avg bitrate, packet loss, jitter
- Error rate: errors per minute
- Metrics refresh every 10 seconds

---

### Test Scenario 6.2: Historical Performance Data
**Priority:** Low
**Requirement:** FR-AM-006

**Test Steps:**
1. View performance charts
2. Select "Last 24 hours" time range

**Expected Results:**
- Charts show historical data for last 24 hours
- Graphs for: CPU, RAM, disk, latency, errors
- Identify patterns and trends
- Zoom/pan functionality
- Data points every minute

---

### Test Scenario 6.3: Performance Alerts
**Priority:** Medium
**Requirement:** FR-AM-006

**Preconditions:**
- CPU usage exceeds 90%

**Test Steps:**
1. Monitor performance page
2. Observe alert

**Expected Results:**
- Alert shown: "High CPU usage detected"
- Alert color-coded (red for critical)
- Admin notified via email/push (if configured)
- Alert logged

---

## TC-AM-007: Manage User Reports

### Test Scenario 7.1: View User Reports List
**Priority:** Medium
**Requirement:** FR-AM-007

**Preconditions:**
- 3 user reports submitted

**Test Steps:**
1. Admin navigates to "User Reports" page
2. Observe list

**Expected Results:**
- List shows all reports
- Each report displays: reporter, reported user, reason, timestamp, status, evidence
- Reports sorted by date (newest first)
- Filter options: status (pending/reviewed/resolved), date range
- Pagination available

---

### Test Scenario 7.2: Investigate User Report
**Priority:** Medium
**Requirement:** FR-AM-007

**Test Steps:**
1. Admin clicks on report to view details
2. Review evidence (screenshots, message links)
3. View reported user's history

**Expected Results:**
- Full report details displayed
- Evidence attachments viewable
- Can view conversation context
- Reported user's profile accessible
- Admin can add investigation notes

---

### Test Scenario 7.3: Take Action on Report - Warn User
**Priority:** Medium
**Requirement:** FR-AM-007

**Test Steps:**
1. Review report
2. Select action: "Warn User"
3. Enter warning message
4. Confirm action

**Expected Results:**
- Warning sent to reported user
- Warning logged in user's account
- Reporter notified of action taken
- Report status: "Resolved"
- Resolution logged with admin ID, action, timestamp

---

### Test Scenario 7.4: Take Action - Deactivate User
**Priority:** High
**Requirement:** FR-AM-007, FR-AM-003

**Test Steps:**
1. Review serious violation report
2. Select action: "Deactivate Account"
3. Enter reason
4. Confirm

**Expected Results:**
- Reported user's account deactivated
- User logged out immediately
- Reporter notified
- Report resolved
- Action logged

---

### Test Scenario 7.5: Dismiss Report
**Priority:** Low
**Requirement:** FR-AM-007

**Test Steps:**
1. Review unfounded report
2. Select action: "Dismiss"
3. Add notes: "No violation found"
4. Confirm

**Expected Results:**
- Report marked as dismissed
- Reporter notified (optional)
- No action taken against reported user
- Dismissal logged

---

### Test Scenario 7.6: Report Statistics
**Priority:** Low
**Requirement:** FR-AM-007

**Test Steps:**
1. View reports dashboard
2. Observe statistics

**Expected Results:**
- Total reports count
- Breakdown by reason: Spam, Harassment, Inappropriate Content
- Breakdown by resolution: Warned, Deactivated, Blocked, Dismissed
- Average resolution time
- Charts and trends

---

## TC-AM-008: View Audit Logs

### Test Scenario 8.1: View All Audit Logs
**Priority:** High
**Requirement:** FR-AM-008

**Test Steps:**
1. Admin navigates to "Audit Logs" page
2. Observe log entries

**Expected Results:**
- Log entries displayed with: timestamp, user_id, action, resource_type, resource_id, IP, user_agent, details
- Logs sorted by timestamp (newest first)
- Pagination (100 entries per page)
- All sensitive actions logged: user actions, admin actions, system events
- Real-time log streaming available

---

### Test Scenario 8.2: Filter Audit Logs
**Priority:** High
**Requirement:** FR-AM-008

**Test Steps:**
1. Apply filters:
   - User: "testuser@example.com"
   - Action: "login"
   - Date range: Last 7 days
2. Click "Apply Filters"

**Expected Results:**
- Logs filtered correctly
- Only login actions by testuser shown
- Only from last 7 days
- Result count updated
- Export filtered results available

---

### Test Scenario 8.3: Search Audit Logs
**Priority:** Medium
**Requirement:** FR-AM-008

**Test Steps:**
1. Enter search term: "password reset"
2. Search logs

**Expected Results:**
- Logs containing "password reset" displayed
- Search across action, resource, details fields
- Case-insensitive search
- Highlighted matches

---

### Test Scenario 8.4: Export Audit Logs
**Priority:** Medium
**Requirement:** FR-AM-008

**Test Steps:**
1. Filter logs as desired
2. Click "Export to CSV" button
3. Download file

**Expected Results:**
- CSV file generated
- Contains all filtered log entries
- Includes all log fields
- File downloadable
- Useful for compliance audits

---

### Test Scenario 8.5: Audit Log Retention (1 Year)
**Priority:** High
**Requirement:** FR-AM-008

**Test Steps:**
1. Search for log entries from 11 months ago
2. Search for log entries from 13 months ago

**Expected Results:**
- 11-month-old logs available
- 13-month-old logs deleted (auto-cleanup)
- 1-year retention policy enforced
- Old logs archived or purged

---

### Test Scenario 8.6: Audit Log Immutability
**Priority:** High
**Requirement:** FR-AM-008, FR-CP-003

**Test Steps:**
1. Admin attempts to edit/delete audit log entry (via UI or API)

**Expected Results:**
- Edit/delete operation fails
- Error: "Audit logs are immutable"
- Logs cannot be modified
- Integrity maintained
- Tampering prevented

---

## TC-AM-009: Configure System Settings

### Test Scenario 9.1: Update Message Retention Period
**Priority:** Medium
**Requirement:** FR-AM-009

**Test Steps:**
1. Admin navigates to system settings
2. Change "Message Retention Period" from 30 to 60 days
3. Click "Save Settings"

**Expected Results:**
- Setting updated successfully
- Confirmation message shown
- New retention period takes effect immediately
- Setting change logged in audit trail
- Future message cleanup uses new period

---

### Test Scenario 9.2: Update Max File Size
**Priority:** Medium
**Requirement:** FR-AM-009

**Test Steps:**
1. Change "Max File Size" from 25MB to 50MB
2. Save settings

**Expected Results:**
- Setting updated
- New uploads can be up to 50MB
- Validation updated
- Change logged

---

### Test Scenario 9.3: Enable/Disable Registration Approval Mode
**Priority:** High
**Requirement:** FR-AM-009

**Test Steps:**
1. Toggle "Registration Approval Mode" from Manual to Auto
2. Save settings

**Expected Results:**
- Setting changed
- New registrations auto-approved (no admin review needed)
- Users can login immediately after email verification
- Mode change logged

---

### Test Scenario 9.4: Enable Maintenance Mode
**Priority:** High
**Requirement:** FR-AM-009

**Test Steps:**
1. Toggle "Maintenance Mode" to ON
2. Save settings
3. Attempt user login

**Expected Results:**
- Maintenance mode activated
- Users cannot login (except admins)
- Message displayed: "System under maintenance. Please try again later."
- Active users logged out (optional)
- Mode change logged

---

### Test Scenario 9.5: Feature Flags
**Priority:** Medium
**Requirement:** FR-AM-009

**Test Steps:**
1. Disable "Video Calls" feature flag
2. Save settings
3. User attempts to initiate video call

**Expected Results:**
- Video call feature disabled
- Video call button hidden in UI
- Attempting call via API fails
- Feature toggle effective immediately
- Change logged

---

### Test Scenario 9.6: Rate Limiting Configuration
**Priority:** Medium
**Requirement:** FR-AM-009, FR-SC-003

**Test Steps:**
1. Change "API Rate Limit" from 100 to 200 requests per minute
2. Save settings

**Expected Results:**
- Rate limit updated
- New limit enforced immediately
- Users can make up to 200 requests/min
- Change logged

---

### Test Scenario 9.7: Invalid Setting Validation
**Priority:** Medium
**Requirement:** FR-AM-009

**Test Steps:**
1. Attempt to set "Max File Size" to 0 MB
2. Attempt to save

**Expected Results:**
- Validation error
- Message: "Max file size must be at least 1MB"
- Setting not saved
- Current value retained

---

## TC-AM-010: Broadcast Announcement

### Test Scenario 10.1: Create and Broadcast Announcement
**Priority:** Low
**Requirement:** FR-AM-010

**Test Steps:**
1. Admin navigates to "Announcements" page
2. Click "New Announcement" button
3. Enter title: "Scheduled Maintenance"
4. Enter message: "System will be down for maintenance on [date] from 2-4 AM UTC"
5. (Optional) Add link: "https://example.com/maintenance"
6. Set expiry: 7 days
7. Preview announcement
8. Click "Broadcast" button

**Expected Results:**
- Announcement created
- All users see announcement on next login
- Announcement displayed as banner/modal
- Users can dismiss announcement
- Announcement visible until expiry or dismissal
- HTML formatting supported
- Broadcast logged in audit trail

---

### Test Scenario 10.2: Schedule Future Announcement
**Priority:** Low
**Requirement:** FR-AM-010

**Test Steps:**
1. Create announcement
2. Set "Schedule for": Tomorrow at 9:00 AM
3. Save

**Expected Results:**
- Announcement scheduled
- Not shown to users yet
- Broadcast automatically at scheduled time
- Admin can edit/cancel before broadcast

---

### Test Scenario 10.3: User Dismisses Announcement
**Priority:** Low
**Requirement:** FR-AM-010

**Test Steps:**
1. User sees announcement
2. Click "X" or "Dismiss" button

**Expected Results:**
- Announcement hidden for that user
- User's dismissal stored
- Announcement not shown again to that user
- Other users still see it

---

### Test Scenario 10.4: Expired Announcement Auto-Removal
**Priority:** Low
**Requirement:** FR-AM-010

**Test Steps:**
1. Announcement set to expire in 1 hour
2. Wait 1 hour
3. User logs in

**Expected Results:**
- Expired announcement not displayed
- Auto-removed after expiry
- No manual deletion needed
