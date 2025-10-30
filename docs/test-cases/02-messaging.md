# Messaging Test Cases

## TC-MS-001: Send 1-to-1 Text Message

### Test Scenario 1.1: Send Text Message Successfully
**Priority:** High
**Requirement:** FR-MS-001

**Preconditions:**
- Two active users logged in
- Users have WebSocket connection established

**Test Steps:**
1. User A opens conversation with User B
2. Type message: "Hello, this is a test message"
3. Click "Send" button or press Enter
4. Observe sender and recipient views

**Expected Results:**
- Message sent immediately
- Sender sees message in conversation with single checkmark (sent)
- Message stored in database with timestamp (UTC)
- If recipient online: message delivered via WebSocket
- Recipient sees message appear in real-time
- Delivery status updated to double checkmark (delivered)
- Message ID generated and returned

---

### Test Scenario 1.2: Send Message to Offline User
**Priority:** High
**Requirement:** FR-MS-001

**Preconditions:**
- User A logged in
- User B offline

**Test Steps:**
1. User A sends message to User B
2. User B logs in
3. Observe message delivery

**Expected Results:**
- Message queued in database
- Sender sees single checkmark (sent)
- When User B logs in: message delivered immediately
- Status updated to double checkmark (delivered)
- User B receives notification

---

### Test Scenario 1.3: Send Long Message (10,000 characters)
**Priority:** Medium
**Requirement:** FR-MS-001

**Test Steps:**
1. Compose message with exactly 10,000 characters
2. Send message
3. Observe result

**Expected Results:**
- Message sent successfully
- Full message content stored
- Message displays correctly in conversation
- Scrolling enabled for long message
- Character counter shows 10,000/10,000

---

### Test Scenario 1.4: Send Message Exceeding Character Limit
**Priority:** Medium
**Requirement:** FR-MS-001

**Test Steps:**
1. Compose message with 10,001+ characters
2. Attempt to send

**Expected Results:**
- Send button disabled OR error message shown
- Message: "Message exceeds 10,000 character limit"
- Message not sent
- Character counter shows 10,001/10,000 in red

---

### Test Scenario 1.5: Send Empty Message
**Priority:** Low
**Requirement:** FR-MS-001

**Test Steps:**
1. Open message input field
2. Leave field empty or enter only whitespace
3. Click "Send" button

**Expected Results:**
- Send button disabled OR message rejected
- No empty message sent
- Input validation prevents submission

---

### Test Scenario 1.6: Send Message with Emojis
**Priority:** Medium
**Requirement:** FR-MS-001

**Test Steps:**
1. Type message: "Hello 👋 How are you? 😊"
2. Send message
3. Verify display on both sender and recipient

**Expected Results:**
- Emojis sent and stored correctly (Unicode support)
- Emojis display correctly on both ends
- No character encoding issues
- Emoji picker works (if available)

---

### Test Scenario 1.7: Send Message with URL
**Priority:** Medium
**Requirement:** FR-MS-001

**Test Steps:**
1. Type message: "Check this out: https://example.com"
2. Send message
3. Observe URL handling

**Expected Results:**
- URL auto-detected
- URL rendered as clickable link
- Link preview generated (if feature enabled)
- Clicking link opens in new tab
- URL sanitized for security

---

### Test Scenario 1.8: Send Message with XSS Attempt
**Priority:** High
**Requirement:** FR-MS-001, FR-SC-006

**Test Steps:**
1. Type message: "<script>alert('XSS')</script>"
2. Send message
3. Observe rendering

**Expected Results:**
- Message content sanitized
- Script tags not executed
- Message displayed as plain text
- No XSS vulnerability
- HTML entities escaped

---

### Test Scenario 1.9: Message Delivery Latency
**Priority:** High
**Requirement:** FR-MS-001, NFR-PF-001

**Test Steps:**
1. Send 10 messages from User A to User B
2. Measure time from send to delivery confirmation
3. Calculate median and 95th percentile

**Expected Results:**
- Median latency <200ms
- 95th percentile <500ms
- 99th percentile <1000ms
- Consistent performance across messages

---

### Test Scenario 1.10: Simultaneous Message Sending
**Priority:** Medium
**Requirement:** FR-MS-001

**Test Steps:**
1. User A and User B both send messages simultaneously
2. Observe message ordering and delivery

**Expected Results:**
- Both messages delivered successfully
- Messages ordered by timestamp
- No message loss
- No race condition issues
- Correct message ordering in both clients

---

## TC-MS-003: Message Status Indicators

### Test Scenario 3.1: Message Sent Status
**Priority:** High
**Requirement:** FR-MS-003

**Test Steps:**
1. User A sends message to offline User B
2. Observe status indicator

**Expected Results:**
- Single checkmark displayed next to message
- Tooltip: "Sent"
- Status indicates message reached server
- Message stored in database

---

### Test Scenario 3.2: Message Delivered Status
**Priority:** High
**Requirement:** FR-MS-003

**Test Steps:**
1. User A sends message to online User B
2. User B receives message
3. Observe status change

**Expected Results:**
- Initially single checkmark
- Changes to double checkmark when delivered
- Tooltip: "Delivered"
- Status updated via WebSocket
- Real-time status change visible to sender

---

### Test Scenario 3.3: Message Read Status
**Priority:** High
**Requirement:** FR-MS-003

**Test Steps:**
1. User A sends message to User B
2. User B opens conversation
3. Message visible on User B's screen
4. Observe status on User A's side

**Expected Results:**
- Status changes to blue/colored double checkmark
- Tooltip: "Read"
- Read receipt sent via WebSocket
- Timestamp when read available
- Real-time status update

---

### Test Scenario 3.4: Read Receipts Disabled
**Priority:** Medium
**Requirement:** FR-MS-003

**Preconditions:**
- User B has disabled read receipts in settings

**Test Steps:**
1. User A sends message to User B
2. User B reads message
3. Observe status on User A's side

**Expected Results:**
- Status remains at "Delivered" (double checkmark)
- No read status sent
- User A cannot see when User B read message
- Privacy setting honored

---

### Test Scenario 3.5: Group Message Status
**Priority:** Medium
**Requirement:** FR-MS-003, FR-MS-002

**Test Steps:**
1. User A sends message to group with 5 members
2. Observe delivery and read status

**Expected Results:**
- Message shows delivered when at least one member receives it
- Tapping status shows per-member delivery/read status
- List displays: Member name, delivered time, read time
- Status aggregated in conversation view

---

## TC-MS-004: Typing Indicators

### Test Scenario 4.1: Typing Indicator Display
**Priority:** Low
**Requirement:** FR-MS-004

**Test Steps:**
1. User A opens conversation with User B
2. User B starts typing
3. User A observes indicator

**Expected Results:**
- "User B is typing..." displayed below conversation
- Indicator appears in real-time (<1 second delay)
- Animated ellipsis shown
- Indicator broadcast via WebSocket

---

### Test Scenario 4.2: Typing Indicator Auto-Clear
**Priority:** Low
**Requirement:** FR-MS-004

**Test Steps:**
1. User B starts typing
2. User B stops typing
3. Wait 3 seconds
4. Observe indicator

**Expected Results:**
- Indicator clears after 3 seconds of inactivity
- Indicator removed from User A's view
- Cleared automatically without explicit action

---

### Test Scenario 4.3: Multiple Users Typing in Group
**Priority:** Low
**Requirement:** FR-MS-004

**Test Steps:**
1. In group chat, User B starts typing
2. User C starts typing
3. User D starts typing
4. User E starts typing
5. Observe indicator on User A's side

**Expected Results:**
- Shows "User B, User C, User D are typing..."
- Maximum 3 names displayed
- If 4+ typing: shows "User B, User C, and 2 others are typing..."
- Updates in real-time as users start/stop typing

---

### Test Scenario 4.4: Typing Event Throttling
**Priority:** Low
**Requirement:** FR-MS-004

**Test Steps:**
1. User B types rapidly
2. Monitor WebSocket traffic
3. Count typing events sent

**Expected Results:**
- Typing events throttled to max 1 per second
- Not every keystroke sends event
- Reduces network overhead
- Still provides real-time feel

---

## TC-MS-005: Message Editing

### Test Scenario 5.1: Edit Message Within Time Limit
**Priority:** Medium
**Requirement:** FR-MS-005

**Test Steps:**
1. User A sends message: "Hello"
2. Within 5 minutes, right-click message and select "Edit"
3. Change message to: "Hello, how are you?"
4. Click "Save" button
5. Observe result on both sides

**Expected Results:**
- Message content updated
- "Edited" label displayed next to message
- Edit timestamp recorded
- Original message preserved in database (edit history)
- Edit notification sent to recipient via WebSocket
- Recipient sees updated message with "Edited" label

---

### Test Scenario 5.2: Edit Message After Time Limit
**Priority:** Medium
**Requirement:** FR-MS-005

**Test Steps:**
1. User A sends message
2. Wait 6 minutes
3. Attempt to edit message

**Expected Results:**
- Edit option disabled or not available
- Message cannot be edited
- Tooltip: "Messages can only be edited within 5 minutes"
- Message remains unchanged

---

### Test Scenario 5.3: Edit Message Multiple Times
**Priority:** Low
**Requirement:** FR-MS-005

**Test Steps:**
1. Send message: "Version 1"
2. Edit to: "Version 2"
3. Edit to: "Version 3"
4. View edit history (if available)

**Expected Results:**
- All edits saved successfully
- Current version displayed: "Version 3 (Edited)"
- Edit history preserved in database
- All versions retained for audit
- Timestamps for each edit recorded

---

### Test Scenario 5.4: Edit Deleted Message
**Priority:** Low
**Requirement:** FR-MS-005

**Test Steps:**
1. Send message
2. Delete message
3. Attempt to edit

**Expected Results:**
- Deleted messages cannot be edited
- Edit option not available
- Error if attempting via API

---

### Test Scenario 5.5: Edit Message to Empty Content
**Priority:** Low
**Requirement:** FR-MS-005

**Test Steps:**
1. Send message
2. Edit message and delete all content
3. Attempt to save empty message

**Expected Results:**
- Save fails
- Error: "Message cannot be empty"
- Original message remains unchanged
- Validation enforced

---

## TC-MS-006: Message Deletion

### Test Scenario 6.1: Delete for Me
**Priority:** Medium
**Requirement:** FR-MS-006

**Test Steps:**
1. User A sends message to User B
2. User A right-clicks message and selects "Delete for Me"
3. Confirm deletion
4. Check User B's view

**Expected Results:**
- Message removed from User A's conversation view
- Message still visible to User B
- Database record marked as deleted for User A only
- User A cannot see message anymore
- Message not fully deleted from database

---

### Test Scenario 6.2: Delete for Everyone Within Time Limit
**Priority:** Medium
**Requirement:** FR-MS-006

**Test Steps:**
1. User A sends message to User B
2. Within 24 hours, User A selects "Delete for Everyone"
3. Confirm deletion
4. Observe both sides

**Expected Results:**
- Message removed from both User A and User B's views
- Message shows "This message was deleted" placeholder
- Database record soft-deleted (deleted_at timestamp set)
- Deletion notification sent to User B via WebSocket
- File attachments removed (if any)

---

### Test Scenario 6.3: Delete for Everyone After Time Limit
**Priority:** Medium
**Requirement:** FR-MS-006

**Test Steps:**
1. User A sends message
2. Wait 25 hours
3. Attempt to delete for everyone

**Expected Results:**
- "Delete for Everyone" option disabled or not available
- Only "Delete for Me" option available
- Message cannot be deleted for recipient
- Tooltip: "Can only delete for everyone within 24 hours"

---

### Test Scenario 6.4: Delete Message with File Attachment
**Priority:** Medium
**Requirement:** FR-MS-006, FR-FL-004

**Test Steps:**
1. User A sends message with file attachment
2. User A deletes message for everyone
3. Check file storage

**Expected Results:**
- Message deleted
- File marked for deletion in database
- File removed from storage within 24 hours
- Thumbnail also deleted
- Disk space reclaimed
- Deletion logged in audit trail

---

### Test Scenario 6.5: Delete Other User's Message
**Priority:** High
**Requirement:** FR-MS-006

**Test Steps:**
1. User A sends message to User B
2. User B attempts to delete User A's message (via API)

**Expected Results:**
- Deletion fails
- Error: "You can only delete your own messages"
- Authorization check enforced
- Message remains unchanged
- Unauthorized attempt logged

---

### Test Scenario 6.6: Bulk Delete Messages
**Priority:** Low
**Requirement:** FR-MS-006

**Test Steps:**
1. User A selects multiple messages (5 messages)
2. Click "Delete Selected"
3. Choose "Delete for Me"
4. Confirm deletion

**Expected Results:**
- All selected messages deleted for User A
- Messages still visible to other participants
- Bulk operation completes successfully
- No partial failures

---

## TC-MS-007: Create Group Chat

### Test Scenario 7.1: Create Group with Minimum Participants
**Priority:** High
**Requirement:** FR-MS-007

**Test Steps:**
1. User A clicks "New Group" button
2. Enter group name: "Test Group"
3. Select 1 other user (User B)
4. Click "Create Group"

**Expected Results:**
- Group created successfully (2 participants: A and B)
- Group ID generated
- User A set as group admin
- Group appears in both users' chat lists
- System message: "User A created group 'Test Group'"
- Both users can send messages

---

### Test Scenario 7.2: Create Group with Maximum Participants
**Priority:** Medium
**Requirement:** FR-MS-007

**Test Steps:**
1. Click "New Group"
2. Enter group name: "Large Group"
3. Select 19 other users (20 total including creator)
4. Click "Create Group"

**Expected Results:**
- Group created successfully with 20 participants
- All participants receive notification
- Group appears in all 20 users' chat lists
- System message posted
- Group functional for messaging

---

### Test Scenario 7.3: Create Group Exceeding Max Participants
**Priority:** Medium
**Requirement:** FR-MS-007

**Test Steps:**
1. Attempt to create group with 20+ participants (21 including creator)

**Expected Results:**
- Creation fails or participant selection limited
- Error: "Maximum 20 participants allowed"
- Cannot select more than 19 other users
- Selection UI enforces limit

---

### Test Scenario 7.4: Create Group with Invalid Name
**Priority:** Medium
**Requirement:** FR-MS-007

**Test Data:**
- Empty name
- 2 characters (below minimum)
- 101 characters (above maximum)

**Test Steps:**
1. Attempt to create group with invalid name
2. Click "Create Group"

**Expected Results:**
- Creation fails
- Error: "Group name must be 3-100 characters"
- Validation enforced
- Group not created

---

### Test Scenario 7.5: Create Group with Description
**Priority:** Low
**Requirement:** FR-MS-007

**Test Steps:**
1. Click "New Group"
2. Enter group name: "Project Team"
3. Enter description: "Discussion for Project X" (up to 500 chars)
4. Add participants
5. Create group

**Expected Results:**
- Group created with description
- Description visible in group info
- Description limited to 500 characters
- Description optional (can be empty)

---

### Test Scenario 7.6: Create Group with Avatar
**Priority:** Low
**Requirement:** FR-MS-007

**Test Steps:**
1. Create new group
2. Upload group avatar (jpg, png, max 5MB)
3. Complete group creation

**Expected Results:**
- Avatar uploaded successfully
- Avatar displayed in group chat list
- Avatar auto-resized to appropriate dimensions
- Avatar visible to all participants
- Default avatar used if none uploaded

---

## TC-MS-008: Manage Group Members

### Test Scenario 8.1: Admin Adds Member to Group
**Priority:** Medium
**Requirement:** FR-MS-008

**Preconditions:**
- User A is group admin
- Group has <20 participants

**Test Steps:**
1. User A opens group info
2. Click "Add Members"
3. Select User C
4. Confirm addition

**Expected Results:**
- User C added to group
- System message: "User A added User C"
- User C receives notification
- User C can see message history (from time of addition)
- Member list updated in real-time for all participants

---

### Test Scenario 8.2: Admin Removes Member from Group
**Priority:** Medium
**Requirement:** FR-MS-008

**Test Steps:**
1. Admin opens group info
2. Click on member name (User B)
3. Select "Remove from Group"
4. Confirm removal

**Expected Results:**
- User B removed from group
- System message: "Admin removed User B"
- User B receives notification
- User B no longer sees group in chat list
- User B cannot send messages to group
- Removal logged

---

### Test Scenario 8.3: Admin Promotes Member to Admin
**Priority:** Medium
**Requirement:** FR-MS-008

**Test Steps:**
1. Admin opens group info
2. Click on member name (User B)
3. Select "Make Admin"
4. Confirm promotion

**Expected Results:**
- User B promoted to admin
- System message: "User B is now an admin"
- User B can now manage members
- User B has admin privileges
- Admin indicator shown next to User B's name

---

### Test Scenario 8.4: Admin Demotes Another Admin
**Priority:** Medium
**Requirement:** FR-MS-008

**Preconditions:**
- User A is creator
- User B is admin (promoted by A)

**Test Steps:**
1. User A opens group info
2. Click on admin User B
3. Select "Remove Admin"
4. Confirm demotion

**Expected Results:**
- User B demoted to regular member
- System message: "User B is no longer an admin"
- User B loses admin privileges
- Cannot manage members anymore

---

### Test Scenario 8.5: Attempt to Remove or Demote Group Creator
**Priority:** High
**Requirement:** FR-MS-008

**Test Steps:**
1. Admin (not creator) attempts to remove creator
2. Attempt to demote creator

**Expected Results:**
- Both operations fail
- Creator cannot be removed
- Creator cannot be demoted
- Error message displayed
- Creator remains with full privileges

---

### Test Scenario 8.6: Non-Admin Attempts Member Management
**Priority:** High
**Requirement:** FR-MS-008

**Test Steps:**
1. Regular member (User B) attempts to add member via API
2. Attempt to remove member
3. Attempt to promote member

**Expected Results:**
- All operations fail
- Error: "Only admins can manage members"
- Authorization check enforced
- No changes made
- Unauthorized attempts logged

---

## TC-MS-009: Leave Group

### Test Scenario 9.1: Regular Member Leaves Group
**Priority:** Medium
**Requirement:** FR-MS-009

**Test Steps:**
1. User B (regular member) opens group info
2. Click "Leave Group"
3. Confirm action

**Expected Results:**
- User B removed from group
- System message: "User B left the group"
- User B no longer sees group
- User B no longer receives messages
- Leave event broadcast to remaining members

---

### Test Scenario 9.2: Admin Leaves Group
**Priority:** Medium
**Requirement:** FR-MS-009

**Test Steps:**
1. User B (admin, not creator) leaves group
2. Confirm action

**Expected Results:**
- User B removed from group
- Admin status removed
- System message posted
- User B no longer has access
- Other admins remain

---

### Test Scenario 9.3: Creator Attempts to Leave Group
**Priority:** High
**Requirement:** FR-MS-009

**Test Steps:**
1. Creator attempts to leave group
2. Observe options

**Expected Results:**
- Cannot leave directly
- Must either:
  a) Transfer ownership to another admin/member, THEN leave
  b) Delete group entirely
- Warning message displayed
- Creator cannot abandon group without action

---

### Test Scenario 9.4: Last Member Leaves Group
**Priority:** Low
**Requirement:** FR-MS-009

**Preconditions:**
- Only one member remains in group

**Test Steps:**
1. Last member attempts to leave
2. Confirm action

**Expected Results:**
- Member leaves successfully
- Group automatically deleted (empty group)
- Group record marked as deleted in database
- Group chat history archived or removed per retention policy

---

## TC-MS-010: Message Search

### Test Scenario 10.1: Search Messages by Content
**Priority:** Medium
**Requirement:** FR-MS-010

**Test Steps:**
1. Navigate to search function
2. Enter search term: "meeting"
3. Press Enter or click Search

**Expected Results:**
- All messages containing "meeting" displayed
- Case-insensitive search
- Results from all user's conversations
- Results paginated (20 per page)
- Search term highlighted in results
- Results sorted by relevance or date

---

### Test Scenario 10.2: Search with Filters
**Priority:** Medium
**Requirement:** FR-MS-010

**Test Steps:**
1. Open search
2. Enter search term: "report"
3. Filter by: Sender = "User B", Date Range = "Last 7 days"
4. Search

**Expected Results:**
- Results filtered by sender and date range
- Only messages from User B containing "report" shown
- Only messages from last 7 days included
- Filter combination works correctly
- Result count accurate

---

### Test Scenario 10.3: Search with Minimum Character Requirement
**Priority:** Low
**Requirement:** FR-MS-010

**Test Steps:**
1. Open search
2. Enter 1 character: "a"
3. Attempt search

**Expected Results:**
- Search disabled or error shown
- Message: "Minimum 2 characters required"
- No search performed
- Validation enforced

---

### Test Scenario 10.4: Search Within Retention Period
**Priority:** Medium
**Requirement:** FR-MS-010, FR-CP-002

**Test Steps:**
1. Search for message sent 20 days ago
2. Search for message sent 35 days ago

**Expected Results:**
- 20-day-old message found (within 30-day retention)
- 35-day-old message NOT found (beyond retention)
- Only messages within retention period searchable
- Old messages auto-deleted per policy

---

### Test Scenario 10.5: Search Pagination
**Priority:** Low
**Requirement:** FR-MS-010

**Preconditions:**
- Search returns >20 results

**Test Steps:**
1. Perform search with many results
2. Navigate through pages

**Expected Results:**
- First page shows 20 results
- Pagination controls visible
- Can navigate to next/previous pages
- Page numbers accurate
- Total result count displayed

---

## TC-MS-011: Message History

### Test Scenario 11.1: Load Recent Message History
**Priority:** High
**Requirement:** FR-MS-011

**Test Steps:**
1. User A opens conversation with User B
2. Observe message loading

**Expected Results:**
- Most recent 50 messages loaded
- Messages sorted by timestamp (newest last/bottom)
- Message metadata included (status, edited flag, attachments)
- Loading completes within 2 seconds
- Smooth scrolling to bottom

---

### Test Scenario 11.2: Load Older Messages (Pagination)
**Priority:** High
**Requirement:** FR-MS-011

**Test Steps:**
1. Open conversation with >50 messages
2. Scroll to top of conversation
3. Observe loading behavior

**Expected Results:**
- Older messages loaded automatically on scroll
- Next 50 messages loaded
- Loading indicator shown
- Smooth pagination
- No duplicate messages
- Scroll position maintained

---

### Test Scenario 11.3: Message Retention Period
**Priority:** High
**Requirement:** FR-MS-011, FR-CP-002

**Test Steps:**
1. Check messages sent 29 days ago
2. Check messages sent 31 days ago

**Expected Results:**
- 29-day-old messages visible
- 31-day-old messages deleted (auto-cleanup)
- Retention policy enforced (30 days)
- Old messages purged automatically
- Storage space freed

---

### Test Scenario 11.4: Encrypted Message Decryption
**Priority:** High
**Requirement:** FR-MS-011, FR-MS-012

**Test Steps:**
1. User A sent E2E encrypted message to User B
2. User B opens conversation
3. Observe message display

**Expected Results:**
- Encrypted content stored in database
- Message decrypted on User B's client
- Decrypted message displayed correctly
- Server cannot read message content
- Decryption automatic and transparent

---

### Test Scenario 11.5: Message History with Mixed Content
**Priority:** Medium
**Requirement:** FR-MS-011

**Test Steps:**
1. Open conversation containing: text, images, files, edited messages, deleted messages
2. Scroll through history

**Expected Results:**
- All message types displayed correctly
- Images show thumbnails
- Files show download links
- Edited messages show "Edited" label
- Deleted messages show "This message was deleted"
- Metadata accurate for all types

---

## TC-MS-012: End-to-End Encryption

### Test Scenario 12.1: E2E Encrypted Message Exchange
**Priority:** High
**Requirement:** FR-MS-012

**Test Steps:**
1. User A sends E2E encrypted message to User B
2. Monitor database storage
3. User B receives message

**Expected Results:**
- Message encrypted on User A's device before transmission
- encrypted_content field populated in database
- content field null or empty
- Server cannot decrypt message
- User B's device decrypts message successfully
- Message displayed correctly to User B
- Encryption indicator shown (padlock icon)

---

### Test Scenario 12.2: Key Exchange via Diffie-Hellman
**Priority:** High
**Requirement:** FR-MS-012

**Test Steps:**
1. User A initiates first conversation with User B
2. Monitor key exchange process
3. Send encrypted message

**Expected Results:**
- Public keys exchanged automatically
- Shared secret computed using Diffie-Hellman
- Key exchange happens transparently
- Users not required to manually exchange keys
- Encryption keys stored securely on devices
- Key exchange logged

---

### Test Scenario 12.3: Group Messages Not E2E Encrypted
**Priority:** High
**Requirement:** FR-MS-012

**Test Steps:**
1. User A sends message to group chat
2. Check database storage
3. Verify encryption type

**Expected Results:**
- Message uses server-side encryption (not E2E)
- content field populated (readable by server)
- Server-side encryption (AES-256) applied to storage
- Group messages clearly not E2E encrypted
- Encryption indicator different from 1-to-1

---

### Test Scenario 12.4: E2E Encryption with libsodium
**Priority:** High
**Requirement:** FR-MS-012

**Test Steps:**
1. Verify encryption library used
2. Send encrypted message
3. Inspect encryption method

**Expected Results:**
- libsodium library used for encryption
- Encryption algorithm: X25519-XSalsa20-Poly1305 (crypto_box)
- Strong cryptographic guarantees
- Industry-standard encryption
- Library version up-to-date

---

### Test Scenario 12.5: Server Cannot Decrypt E2E Messages
**Priority:** High
**Requirement:** FR-MS-012

**Test Steps:**
1. Send E2E encrypted message
2. Admin attempts to view message content from database
3. Attempt to decrypt on server

**Expected Results:**
- Database shows encrypted_content only
- Server does not have decryption keys
- Admin cannot read message content
- Message content truly end-to-end encrypted
- Only sender and recipient can decrypt
- Privacy guaranteed

---

### Test Scenario 12.6: E2E Encryption Performance
**Priority:** Medium
**Requirement:** FR-MS-012

**Test Steps:**
1. Send 100 E2E encrypted messages
2. Measure encryption/decryption time
3. Compare to non-encrypted messages

**Expected Results:**
- Encryption overhead <50ms per message
- Decryption overhead <50ms per message
- No noticeable delay to user
- Performance acceptable
- No impact on message delivery latency (<500ms total)
