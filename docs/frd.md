FUNCTIONAL REQUIREMENTS DOCUMENT
Messenger Application with Video Calling
Version 1.0 - November 2024

Document Control
Document Owner: System Analyst
Last Updated: November 2024
Status: Final
Related Documents: BRD v1.0, Architecture v2.0

1. INTRODUCTION

1.1 Purpose
This Functional Requirements Document (FRD) defines the detailed functional requirements for a messenger application supporting up to 100 users with text messaging and 1-to-1 video calling capabilities. This document serves as the definitive specification for development, testing, and validation.

1.2 Scope
The system shall provide:
- User authentication and authorization with admin approval workflow
- Real-time text messaging (1-to-1 and group)
- Video and voice calling (1-to-1 only)
- File sharing with security scanning
- User presence and notification management
- Administrative controls and monitoring
- GDPR-compliant data management

1.3 Target Audience
- Development Team
- Quality Assurance Team
- Project Managers
- System Administrators
- Business Stakeholders

1.4 Definitions and Acronyms
2FA - Two-Factor Authentication
API - Application Programming Interface
E2E - End-to-End Encryption
GDPR - General Data Protection Regulation
JWT - JSON Web Token
RBAC - Role-Based Access Control
RTO - Recovery Time Objective
RPO - Recovery Point Objective
TLS - Transport Layer Security
TOTP - Time-based One-Time Password
WebRTC - Web Real-Time Communication

2. FUNCTIONAL REQUIREMENTS

2.1 USER MANAGEMENT

FR-UM-001: User Registration
Priority: High
Description: The system shall allow new users to register with email and password
Acceptance Criteria:
- User provides valid email address (RFC 5322 compliant)
- Password meets complexity requirements (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
- Email verification link sent upon registration
- Account created with status='pending' awaiting admin approval
- User cannot login until admin approves account
- Duplicate email addresses rejected
- Registration form includes: username, email, password, confirm password
Dependencies: None
Related Requirements: FR-UM-002, FR-AM-001

FR-UM-002: Email Verification
Priority: High
Description: The system shall verify user email addresses before account activation
Acceptance Criteria:
- Verification email sent within 1 minute of registration
- Verification link valid for 24 hours
- Clicking link verifies email and updates user record
- Expired links show appropriate error message
- User can request new verification email
Dependencies: FR-UM-001
Related Requirements: FR-NT-001

FR-UM-003: User Login
Priority: High
Description: The system shall authenticate users with email/password credentials
Acceptance Criteria:
- User provides email and password
- Only users with status='active' can login
- Successful login returns JWT access token (24hr expiry) and refresh token (7-day expiry)
- Failed login attempts logged with IP address
- Account locked after 5 failed attempts within 15 minutes
- Locked account auto-unlocks after 30 minutes
- Optional 2FA verification if enabled
- Session created with 30-minute inactivity timeout
Dependencies: FR-UM-001, FR-UM-002
Related Requirements: FR-SC-001, FR-SC-002, FR-UM-008

FR-UM-004: User Logout
Priority: Medium
Description: The system shall allow users to logout and invalidate their session
Acceptance Criteria:
- User can logout from any active session
- JWT tokens invalidated upon logout
- Session removed from active sessions table
- User redirected to login page
- WebSocket connection closed
Dependencies: FR-UM-003
Related Requirements: FR-SC-002

FR-UM-005: Password Reset
Priority: High
Description: The system shall allow users to reset forgotten passwords
Acceptance Criteria:
- User provides registered email address
- Reset link sent to email within 1 minute
- Reset token valid for 1 hour
- Reset form validates new password complexity
- Old password invalidated after successful reset
- User notified via email of password change
- Password history prevents reuse of last 3 passwords
Dependencies: FR-UM-001
Related Requirements: FR-NT-001, FR-SC-001

FR-UM-006: Profile Management
Priority: Medium
Description: The system shall allow users to view and update their profile
Acceptance Criteria:
- User can view: username, email, profile picture, bio, status, created date
- User can update: username, profile picture, bio, online status
- Username must be unique (3-50 characters)
- Bio limited to 500 characters
- Profile picture max 5MB (jpg, png, gif)
- Profile picture auto-resized to 200x200px
- Email changes require re-verification
- Changes saved in real-time
Dependencies: FR-UM-003
Related Requirements: FR-FL-001

FR-UM-007: Account Deletion
Priority: Medium
Description: The system shall allow users to delete their accounts (GDPR compliance)
Acceptance Criteria:
- User can request account deletion from settings
- Confirmation dialog warns of permanent data loss
- User must re-authenticate before deletion
- Account marked for deletion (soft delete)
- Personal data anonymized/deleted within 30 days
- User's messages remain visible with "Deleted User" attribution
- User notified via email of account deletion
- Deletion audit logged
Dependencies: FR-UM-003
Related Requirements: FR-CP-001, FR-AM-008

FR-UM-008: Two-Factor Authentication (2FA)
Priority: Medium
Description: The system shall support optional TOTP-based 2FA
Acceptance Criteria:
- User can enable 2FA from security settings
- QR code generated for authenticator app setup
- Backup codes provided (10 single-use codes)
- 2FA required at login after enabled
- User can disable 2FA with current password
- 2FA bypass with backup codes if device unavailable
- Failed 2FA attempts logged
Dependencies: FR-UM-003
Related Requirements: FR-SC-003, FR-AM-008

FR-UM-009: User Status Management
Priority: Medium
Description: The system shall track and display user online/offline/away status
Acceptance Criteria:
- Status automatically set to 'online' upon login
- Status set to 'away' after 5 minutes of inactivity
- Status set to 'offline' upon logout or connection loss
- Users can manually set status (online/away/busy/offline)
- Status changes broadcast to user's contacts in real-time
- Last seen timestamp updated on status change
- Custom status message (optional, max 100 chars)
Dependencies: FR-UM-003
Related Requirements: FR-CM-001, FR-RT-002

FR-UM-010: User Search
Priority: Medium
Description: The system shall allow users to search for other users
Acceptance Criteria:
- Search by username or email (partial match)
- Results limited to active users only
- Blocked users excluded from search results
- Search results show: username, profile picture, online status
- Pagination with 20 results per page
- Search query minimum 2 characters
- Case-insensitive search
Dependencies: FR-UM-003
Related Requirements: FR-CT-001

FR-UM-011: Data Export (GDPR)
Priority: Medium
Description: The system shall allow users to download their personal data
Acceptance Criteria:
- User can request data export from settings
- Export includes: profile, messages, files, call history, contacts
- Data provided in JSON format
- Export generated within 24 hours
- Download link sent via email
- Export file encrypted with user password
- Export link valid for 7 days
- Export request logged in audit trail
Dependencies: FR-UM-003
Related Requirements: FR-CP-001, FR-AM-008

2.2 MESSAGING FEATURES

FR-MS-001: Send 1-to-1 Text Message
Priority: High
Description: The system shall allow users to send text messages to other users
Acceptance Criteria:
- Message content up to 10,000 characters
- Sender and recipient must be active users
- Message delivered via WebSocket if recipient online
- Message stored if recipient offline (queued for delivery)
- Message delivery status updated (sent/delivered/read)
- Delivery notification sent to sender
- Emoji support (Unicode characters)
- URL auto-detection and preview generation
- Message timestamp in UTC
Dependencies: FR-UM-003
Related Requirements: FR-RT-001, FR-MS-003, FR-MS-004

FR-MS-002: Group Chat Messaging
Priority: High
Description: The system shall support group chat messaging (up to 20 participants)
Acceptance Criteria:
- Group creator can add/remove members
- Maximum 20 participants per group
- All group members receive messages in real-time
- Group messages stored with group_id reference
- Message delivery status per recipient
- Group member can leave group voluntarily
- Last message displayed in group list
- Unread message count per group
Dependencies: FR-UM-003, FR-MS-007
Related Requirements: FR-MS-001, FR-RT-001

FR-MS-003: Message Status Indicators
Priority: High
Description: The system shall track and display message status (sent/delivered/read)
Acceptance Criteria:
- Single checkmark: message sent to server
- Double checkmark: message delivered to recipient
- Blue/colored checkmark: message read by recipient
- Status updated in real-time via WebSocket
- Group messages show read receipts per member
- User can disable read receipts in settings
- Status visible to sender only
Dependencies: FR-MS-001
Related Requirements: FR-RT-001

FR-MS-004: Typing Indicators
Priority: Low
Description: The system shall show when other users are typing
Acceptance Criteria:
- "User is typing..." shown when user actively typing
- Indicator cleared after 3 seconds of inactivity
- Indicator broadcast via WebSocket
- Multiple users typing shown as "User1, User2 are typing..."
- Group typing limited to display max 3 names
- Typing events throttled (max 1 per second)
Dependencies: FR-MS-001
Related Requirements: FR-RT-002

FR-MS-005: Message Editing
Priority: Medium
Description: The system shall allow users to edit their messages within 5 minutes
Acceptance Criteria:
- User can edit own messages only
- Edit allowed within 5 minutes of sending
- "Edited" label shown on edited messages
- Edit history preserved in database
- Original message retained for audit purposes
- Edit notification sent to recipients via WebSocket
- Deleted messages cannot be edited
Dependencies: FR-MS-001
Related Requirements: FR-MS-006

FR-MS-006: Message Deletion
Priority: Medium
Description: The system shall allow users to delete their messages
Acceptance Criteria:
- User can delete own messages only
- Two deletion modes: "Delete for me" and "Delete for everyone"
- "Delete for everyone" allowed within 24 hours
- Deleted message shows "This message was deleted"
- Actual content soft-deleted (marked with deleted_at timestamp)
- File attachments removed upon deletion
- Deletion notification sent to recipients
Dependencies: FR-MS-001
Related Requirements: FR-MS-005

FR-MS-007: Create Group Chat
Priority: High
Description: The system shall allow users to create group chats
Acceptance Criteria:
- User can create group with name and optional description
- Group name required (3-100 characters)
- Description optional (max 500 characters)
- Creator automatically becomes group admin
- Minimum 2 participants (including creator)
- Maximum 20 participants
- Group avatar optional (max 5MB)
- Group ID generated automatically
Dependencies: FR-UM-003
Related Requirements: FR-MS-002, FR-MS-008, FR-MS-009

FR-MS-008: Manage Group Members
Priority: Medium
Description: The system shall allow group admins to manage group membership
Acceptance Criteria:
- Group admin can add members (up to 20 total)
- Group admin can remove members
- Group admin can promote members to admin
- Group admin can demote other admins
- Group creator cannot be removed or demoted
- Member receives notification upon add/remove
- Member list updated in real-time
Dependencies: FR-MS-007
Related Requirements: FR-MS-002, FR-NT-002

FR-MS-009: Leave Group
Priority: Medium
Description: The system shall allow users to leave groups voluntarily
Acceptance Criteria:
- Any member can leave group (except creator)
- Group creator must transfer ownership or delete group
- User removed from group members list
- User no longer receives group messages
- Leave event broadcast to remaining members
- System message posted in group chat
Dependencies: FR-MS-007
Related Requirements: FR-MS-002

FR-MS-010: Message Search
Priority: Medium
Description: The system shall allow users to search message history
Acceptance Criteria:
- Search across all user's conversations
- Search by message content (full-text search)
- Filter by sender, date range, conversation
- Case-insensitive search
- Minimum 2 characters for search
- Results paginated (20 per page)
- Search within 30-day retention period only
- Highlight search terms in results
Dependencies: FR-MS-001
Related Requirements: FR-MS-011

FR-MS-011: Message History
Priority: High
Description: The system shall store and retrieve message history
Acceptance Criteria:
- Messages retained for 30 days
- Older messages automatically deleted
- Pagination support (50 messages per page)
- Load older messages on scroll
- Messages sorted by timestamp (newest last)
- Include message metadata (status, edited flag, attachments)
- Encrypted messages decrypted on client
Dependencies: FR-MS-001
Related Requirements: FR-SC-004, FR-CP-002

FR-MS-012: End-to-End Encryption (E2E)
Priority: High
Description: The system shall encrypt 1-to-1 messages end-to-end
Acceptance Criteria:
- Messages encrypted on sender device before transmission
- Server cannot decrypt message content
- Recipient decrypts message on their device
- Encryption uses libsodium library
- Key exchange via Diffie-Hellman protocol
- Encrypted content stored in encrypted_content field
- Group messages not E2E encrypted (server-side encryption)
Dependencies: FR-MS-001
Related Requirements: FR-SC-004, FR-VC-008

2.3 FILE SHARING

FR-FL-001: File Upload
Priority: High
Description: The system shall allow users to share files in conversations
Acceptance Criteria:
- Maximum file size: 25MB
- Supported formats: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, mp4
- File scanned for malware before storage (ClamAV)
- Infected files rejected with error message
- File metadata stored in files table
- File associated with message_id
- Upload progress indicator shown
- Thumbnail auto-generated for images
- File upload limited to 10 per hour per user
Dependencies: FR-MS-001
Related Requirements: FR-FL-002, FR-FL-003, FR-SC-005

FR-FL-002: File Download
Priority: High
Description: The system shall allow users to download shared files
Acceptance Criteria:
- Authenticated users can download files from their conversations
- Original filename preserved
- File served with correct MIME type
- Download counter incremented
- Virus scan status checked before download
- Infected files blocked from download
- Download link expires after 24 hours
- Download logged for audit purposes
Dependencies: FR-FL-001
Related Requirements: FR-AM-008

FR-FL-003: Thumbnail Generation
Priority: Medium
Description: The system shall generate thumbnails for image files
Acceptance Criteria:
- Thumbnails created for jpg, png, gif formats
- Thumbnail size: 200x200px
- Aspect ratio preserved
- Thumbnail generated asynchronously after upload
- Thumbnail stored in separate location
- Fallback to icon if thumbnail generation fails
- Thumbnails served with cache headers
Dependencies: FR-FL-001
Related Requirements: None

FR-FL-004: File Deletion
Priority: Medium
Description: The system shall delete files when associated messages are deleted
Acceptance Criteria:
- File deleted when message deleted "for everyone"
- File marked for deletion in database
- Actual file removed from storage within 24 hours
- Thumbnails also deleted
- Disk space reclaimed
- Deletion logged in audit trail
Dependencies: FR-FL-001, FR-MS-006
Related Requirements: FR-AM-008

2.4 VIDEO/VOICE CALLING

FR-VC-001: Initiate Call
Priority: High
Description: The system shall allow users to initiate 1-to-1 video or voice calls
Acceptance Criteria:
- User can initiate video or voice call to online contacts
- Call request sent via WebSocket
- Recipient receives incoming call notification
- Call attempt logged in calls table
- Caller sees "Calling..." status
- Call automatically cancelled after 60 seconds if not answered
- Maximum 10 concurrent calls system-wide
Dependencies: FR-UM-003, FR-CT-001
Related Requirements: FR-VC-002, FR-VC-003, FR-RT-003

FR-VC-002: Accept Call
Priority: High
Description: The system shall allow users to accept incoming calls
Acceptance Criteria:
- User receives call notification with caller info
- User can accept or reject within 60 seconds
- Accepting initiates WebRTC handshake
- Call status updated to 'connected'
- Call timer starts
- STUN/TURN server used for NAT traversal
- P2P connection established when possible
Dependencies: FR-VC-001
Related Requirements: FR-VC-003, FR-VC-007

FR-VC-003: Reject Call
Priority: High
Description: The system shall allow users to reject incoming calls
Acceptance Criteria:
- User can reject incoming call
- Caller notified of rejection
- Call status updated to 'rejected'
- Call record saved with 0 duration
- Rejection notification sent via WebSocket
Dependencies: FR-VC-001
Related Requirements: FR-VC-002

FR-VC-004: End Call
Priority: High
Description: The system shall allow users to end active calls
Acceptance Criteria:
- Either participant can end call
- WebRTC connection closed
- Call status updated to 'ended'
- Call duration calculated and stored
- End notification sent to other participant
- Call summary shown (duration, quality)
- Media streams stopped and resources released
Dependencies: FR-VC-002
Related Requirements: FR-VC-009

FR-VC-005: Mute/Unmute Audio
Priority: High
Description: The system shall allow users to mute/unmute their microphone during calls
Acceptance Criteria:
- User can toggle microphone on/off
- Mute status shown on UI
- Mute event sent to other participant
- Other participant sees mute indicator
- Audio stream paused when muted
- Mute state persists until toggled
Dependencies: FR-VC-002
Related Requirements: FR-VC-006

FR-VC-006: Enable/Disable Video
Priority: High
Description: The system shall allow users to toggle video during calls
Acceptance Criteria:
- User can enable/disable camera during video call
- Video status shown on UI
- Video disable event sent to other participant
- Placeholder shown when video disabled
- Voice-only mode if both disable video
- Video stream paused when disabled
Dependencies: FR-VC-002
Related Requirements: FR-VC-005

FR-VC-007: Network Quality Indicator
Priority: Medium
Description: The system shall display network quality during calls
Acceptance Criteria:
- Quality indicator: Good/Fair/Poor
- Based on packet loss, latency, jitter metrics
- Updated every 2 seconds
- Visual indicator (green/yellow/red)
- Automatic quality adjustment
- Warning shown if quality degrades
Dependencies: FR-VC-002
Related Requirements: None

FR-VC-008: Call Encryption
Priority: High
Description: The system shall encrypt video/voice calls end-to-end
Acceptance Criteria:
- WebRTC DTLS-SRTP encryption enabled
- Encryption keys exchanged securely
- Server cannot decrypt media streams
- Encryption status shown on call UI
- P2P connection encrypted
- TURN relay connections encrypted
Dependencies: FR-VC-002
Related Requirements: FR-MS-012, FR-SC-004

FR-VC-009: Call History
Priority: Medium
Description: The system shall maintain call history for users
Acceptance Criteria:
- Call records stored with: caller, recipient, type, duration, timestamp, status
- History shows: missed, rejected, completed calls
- User can view their call history
- History paginated (20 entries per page)
- Call duration formatted (HH:MM:SS)
- Filter by call type (video/voice) and status
- History retained for 90 days
Dependencies: FR-VC-001
Related Requirements: FR-CP-002

FR-VC-010: Incoming Call Notification
Priority: High
Description: The system shall notify users of incoming calls
Acceptance Criteria:
- Real-time notification via WebSocket
- Push notification if mobile app
- Browser notification if web app
- Ringtone plays on incoming call
- Caller info displayed (name, avatar)
- Call type shown (video/voice)
- Notification dismissed on accept/reject/timeout
Dependencies: FR-VC-001
Related Requirements: FR-NT-002, FR-RT-003

2.5 CONTACT MANAGEMENT

FR-CT-001: Add Contact
Priority: Medium
Description: The system shall allow users to add other users as contacts
Acceptance Criteria:
- User can search and add other users as contacts
- Contact request not required (direct add)
- Added contact appears in contacts list
- Contact status set to 'active'
- User can add up to 100 contacts
- Duplicate contacts prevented
- Add event logged
Dependencies: FR-UM-003, FR-UM-010
Related Requirements: FR-CT-002

FR-CT-002: Remove Contact
Priority: Medium
Description: The system shall allow users to remove contacts
Acceptance Criteria:
- User can remove contact from list
- Contact removed from both users' lists
- Existing conversations preserved
- Remove confirmation dialog shown
- Removal logged in audit trail
Dependencies: FR-CT-001
Related Requirements: FR-CT-003

FR-CT-003: Block Contact
Priority: Medium
Description: The system shall allow users to block unwanted contacts
Acceptance Criteria:
- User can block any contact
- Blocked user cannot send messages
- Blocked user cannot initiate calls
- Blocked user excluded from search results
- User appears offline to blocked contact
- Block status stored in contacts table
- User can unblock later
- Block action logged
Dependencies: FR-CT-001
Related Requirements: FR-CT-004, FR-AM-007

FR-CT-004: Unblock Contact
Priority: Medium
Description: The system shall allow users to unblock previously blocked contacts
Acceptance Criteria:
- User can unblock from blocked contacts list
- Contact status changed to 'active'
- Normal communication restored
- Unblock confirmation required
- Unblock action logged
Dependencies: FR-CT-003
Related Requirements: FR-CT-001

FR-CT-005: View Contacts List
Priority: Medium
Description: The system shall display user's contacts with online status
Acceptance Criteria:
- Contacts sorted alphabetically by username
- Online status indicator shown (online/away/offline)
- Last seen timestamp for offline contacts
- Profile picture displayed
- Search/filter contacts by name
- Separate sections for online/offline contacts
- Contact count displayed
Dependencies: FR-CT-001
Related Requirements: FR-UM-009

2.6 NOTIFICATIONS

FR-NT-001: Email Notifications
Priority: High
Description: The system shall send email notifications for important events
Acceptance Criteria:
- Email sent for: registration, verification, password reset, account approval
- Email sent from noreply@domain.com
- Email includes relevant action links
- Email template branded with app logo
- Email sent within 1 minute of event
- Failed emails retried 3 times
- Email service: SendGrid or AWS SES
- User can unsubscribe from non-critical emails
Dependencies: FR-UM-001
Related Requirements: FR-NT-004

FR-NT-002: In-App Notifications
Priority: High
Description: The system shall provide in-app notifications for user activities
Acceptance Criteria:
- Notifications for: new message, missed call, mention, admin action
- Notification badge on app icon
- Unread count displayed
- Notification bell with dropdown list
- Click notification navigates to relevant content
- Notifications sorted by timestamp (newest first)
- Mark as read functionality
- Auto-dismiss after 30 days
Dependencies: FR-UM-003
Related Requirements: FR-NT-003, FR-RT-001

FR-NT-003: Push Notifications
Priority: High
Description: The system shall send push notifications to mobile devices
Acceptance Criteria:
- Push notifications via Firebase Cloud Messaging (FCM)
- Notifications for: new message, incoming call, mentions
- User can enable/disable per notification type
- Notification shown even when app backgrounded
- Tapping notification opens app to relevant screen
- Notification includes sender name and preview
- User can disable all push notifications
- Quiet hours support (user-defined schedule)
Dependencies: FR-UM-003
Related Requirements: FR-NT-002

FR-NT-004: Notification Preferences
Priority: Medium
Description: The system shall allow users to configure notification preferences
Acceptance Criteria:
- User can enable/disable per notification type
- Options: email, push, in-app for each event type
- Quiet hours configuration (start/end time)
- Do Not Disturb mode toggle
- Preview on/off (show/hide message content)
- Sound on/off per notification type
- Preferences saved per device
- Default: all notifications enabled
Dependencies: FR-UM-003
Related Requirements: FR-NT-001, FR-NT-002, FR-NT-003

2.7 ADMIN FEATURES

FR-AM-001: Approve User Registration
Priority: High
Description: The system shall allow admins to approve pending user registrations
Acceptance Criteria:
- Admin can view list of pending registrations
- List shows: username, email, registration date
- Admin can approve or reject each request
- Approved user status changed to 'active'
- Welcome email sent to approved user
- Rejection email sent to rejected user
- Rejected user account deleted
- Approval/rejection logged in audit trail
Dependencies: FR-UM-001
Related Requirements: FR-AM-002, FR-AM-008

FR-AM-002: Reject User Registration
Priority: High
Description: The system shall allow admins to reject user registrations
Acceptance Criteria:
- Admin can reject with optional reason
- Rejection reason included in email to user
- User account marked for deletion
- User data removed within 24 hours
- Rejection logged with reason in audit trail
Dependencies: FR-UM-001, FR-AM-001
Related Requirements: FR-AM-008

FR-AM-003: Deactivate User Account
Priority: High
Description: The system shall allow admins to deactivate user accounts
Acceptance Criteria:
- Admin can deactivate any non-admin user account
- Deactivation reason required (violation, request, etc.)
- User status changed to 'inactive'
- User immediately logged out
- User cannot login while inactive
- Deactivation email sent to user
- Admin can reactivate later
- Deactivation logged with reason
Dependencies: FR-UM-003
Related Requirements: FR-AM-004, FR-AM-008

FR-AM-004: Reactivate User Account
Priority: Medium
Description: The system shall allow admins to reactivate deactivated accounts
Acceptance Criteria:
- Admin can reactivate inactive accounts
- User status changed to 'active'
- User can login after reactivation
- Reactivation email sent to user
- Reactivation logged in audit trail
- User's data and messages preserved
Dependencies: FR-AM-003
Related Requirements: FR-AM-008

FR-AM-005: View System Statistics
Priority: Medium
Description: The system shall provide system statistics dashboard for admins
Acceptance Criteria:
- Dashboard shows: total users, active users, pending registrations
- Storage usage (total, by user, by file type)
- Performance metrics (message latency, call quality)
- Active calls count
- Daily/weekly/monthly activity trends
- User growth chart
- Top active users list
- Export statistics as CSV/PDF
Dependencies: FR-UM-003
Related Requirements: FR-AM-006

FR-AM-006: Monitor System Performance
Priority: Medium
Description: The system shall display real-time performance metrics to admins
Acceptance Criteria:
- Metrics displayed: CPU, RAM, disk usage, network bandwidth
- Database connection pool status
- Message delivery latency
- Active WebSocket connections
- Call quality metrics
- Error rates and exceptions
- Refresh every 10 seconds
- Historical data for last 24 hours
Dependencies: FR-AM-005
Related Requirements: None

FR-AM-007: Manage User Reports
Priority: Medium
Description: The system shall allow admins to review and act on user reports
Acceptance Criteria:
- Admin can view list of user reports
- Report shows: reporter, reported user, reason, timestamp, evidence
- Admin can investigate report
- Admin can take action: warn, deactivate, block, dismiss
- Admin can add notes to report
- Reporter notified of outcome
- Report resolution logged
- Statistics on report types and resolutions
Dependencies: FR-CT-003
Related Requirements: FR-AM-003, FR-AM-008

FR-AM-008: View Audit Logs
Priority: High
Description: The system shall provide comprehensive audit logs for admins
Acceptance Criteria:
- Audit log captures: user actions, admin actions, system events
- Log entry includes: timestamp, user_id, action, resource_type, resource_id, IP, user_agent, details
- Filterable by: user, action type, date range, resource
- Searchable log entries
- Export logs as CSV
- Logs retained for 1 year
- Pagination (100 entries per page)
- Real-time log streaming
Dependencies: FR-UM-003
Related Requirements: All FR-AM requirements

FR-AM-009: Configure System Settings
Priority: Medium
Description: The system shall allow admins to configure system-wide settings
Acceptance Criteria:
- Configurable settings: message retention period, max file size, max group size
- Settings: registration approval mode (auto/manual)
- Maintenance mode toggle
- Feature flags (enable/disable features)
- Rate limiting thresholds
- Settings validated before save
- Setting changes logged
- Settings take effect immediately
Dependencies: FR-UM-003
Related Requirements: FR-AM-008

FR-AM-010: Broadcast Announcement
Priority: Low
Description: The system shall allow admins to broadcast announcements to all users
Acceptance Criteria:
- Admin can create system announcement
- Announcement shown to all users on login
- Announcement dismissible by user
- Announcement can be scheduled for future
- Announcement includes: title, message, link (optional), expiry
- Supports HTML formatting
- Preview before broadcast
- Broadcast logged in audit trail
Dependencies: FR-UM-003
Related Requirements: FR-NT-002

2.8 REAL-TIME COMMUNICATION

FR-RT-001: WebSocket Connection
Priority: High
Description: The system shall maintain persistent WebSocket connections for real-time features
Acceptance Criteria:
- WebSocket connection established on login
- Connection authenticated with JWT token
- Auto-reconnect on disconnect (max 5 retries, exponential backoff)
- Heartbeat ping every 25 seconds
- Connection timeout after 60 seconds of no pong
- Support for 40 concurrent connections
- Connection closed on logout
- Connection state synchronized with user status
Dependencies: FR-UM-003
Related Requirements: FR-RT-002, FR-RT-003

FR-RT-002: Real-Time Status Updates
Priority: High
Description: The system shall broadcast user status changes in real-time
Acceptance Criteria:
- Status changes sent via WebSocket to user's contacts
- Event payload includes: user_id, status, timestamp
- Status update throttled (max 1 per 5 seconds)
- Offline status set on connection loss
- Last seen updated on status change
- Custom status message broadcast
Dependencies: FR-RT-001, FR-UM-009
Related Requirements: FR-MS-004

FR-RT-003: Real-Time Call Signaling
Priority: High
Description: The system shall relay WebRTC signaling messages in real-time
Acceptance Criteria:
- Signal messages: offer, answer, ice-candidate
- Messages routed to recipient via WebSocket
- Signaling for call initiation, acceptance, rejection, end
- Support for 10 concurrent calls
- Signal messages not persisted
- Low latency (<100ms) for signaling
Dependencies: FR-RT-001, FR-VC-001
Related Requirements: FR-VC-002

2.9 SECURITY & COMPLIANCE

FR-SC-001: Password Security
Priority: High
Description: The system shall enforce secure password practices
Acceptance Criteria:
- Password hashed with bcrypt (minimum 10 rounds)
- Password complexity enforced: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Password history prevents reuse of last 3 passwords
- Password never transmitted or stored in plaintext
- Password never logged or included in error messages
- Failed login attempts rate limited
Dependencies: FR-UM-001
Related Requirements: FR-SC-002

FR-SC-002: Session Management
Priority: High
Description: The system shall manage user sessions securely
Acceptance Criteria:
- JWT access tokens expire after 24 hours
- Refresh tokens expire after 7 days
- Session timeout after 30 minutes of inactivity
- Session invalidated on logout
- Concurrent session limit: 5 per user
- Session stored in Redis with expiry
- Session includes: user_id, IP, user_agent, device
- User can view and revoke active sessions
Dependencies: FR-UM-003
Related Requirements: FR-SC-001

FR-SC-003: Rate Limiting
Priority: High
Description: The system shall implement rate limiting to prevent abuse
Acceptance Criteria:
- Login attempts: 5 per IP per 15 minutes
- API requests: 100 per user per minute
- Message sending: 100 per user per minute
- File uploads: 10 per user per hour
- Contact additions: 20 per user per day
- Rate limit headers included in responses
- 429 status code returned when exceeded
- Rate limits configurable by admin
Dependencies: FR-UM-003
Related Requirements: FR-SC-001

FR-SC-004: Data Encryption
Priority: High
Description: The system shall encrypt sensitive data at rest and in transit
Acceptance Criteria:
- All connections use TLS 1.2+ (HTTPS, WSS)
- E2E encryption for 1-to-1 messages (libsodium)
- E2E encryption for 1-to-1 calls (DTLS-SRTP)
- File uploads encrypted at rest (AES-256)
- Database encryption for sensitive fields
- Encryption keys rotated every 90 days
- Key management via environment variables
Dependencies: FR-MS-012, FR-VC-008
Related Requirements: FR-SC-005

FR-SC-005: Malware Scanning
Priority: High
Description: The system shall scan uploaded files for malware
Acceptance Criteria:
- All uploaded files scanned with ClamAV
- Scan performed before file storage
- Infected files rejected with error message
- Scan status stored in files table
- Scan timeout: 30 seconds
- Files quarantined if scan fails
- Admin notified of infected file attempts
- Virus definitions updated daily
Dependencies: FR-FL-001
Related Requirements: FR-SC-004

FR-SC-006: Input Validation & Sanitization
Priority: High
Description: The system shall validate and sanitize all user inputs
Acceptance Criteria:
- Server-side validation for all inputs
- XSS prevention (sanitize HTML input)
- SQL injection prevention (parameterized queries)
- CSRF token validation for state-changing operations
- File upload validation (type, size, content)
- Email validation (RFC 5322)
- URL validation and sanitization
- Validation error messages user-friendly
Dependencies: All input-accepting requirements
Related Requirements: FR-SC-004

FR-SC-007: CSRF Protection
Priority: High
Description: The system shall protect against Cross-Site Request Forgery attacks
Acceptance Criteria:
- CSRF tokens generated for all forms
- Token validated on submission
- Token expires after 1 hour
- Token regenerated after login
- Double-submit cookie pattern for AJAX requests
- SameSite cookie attribute set
- Token included in all state-changing requests
Dependencies: FR-UM-003
Related Requirements: FR-SC-006

2.10 COMPLIANCE & DATA RETENTION

FR-CP-001: GDPR Compliance
Priority: High
Description: The system shall comply with GDPR requirements for EU users
Acceptance Criteria:
- Privacy policy published and accessible
- User consent obtained for data processing
- User can download personal data (JSON format)
- User can request account deletion
- Account deletion completed within 30 days
- Data breach notification within 72 hours
- Data portability supported
- Right to be forgotten implemented
- Data processing purposes documented
Dependencies: FR-UM-007, FR-UM-011
Related Requirements: FR-CP-002

FR-CP-002: Data Retention Policy
Priority: High
Description: The system shall enforce data retention policies
Acceptance Criteria:
- Messages auto-deleted after 30 days
- Call logs retained for 90 days
- User profiles retained until account deletion
- Audit logs retained for 1 year
- Backups retained for 7 days locally
- Weekly backups replicated to remote location
- Deleted data purged from backups within 30 days
- Retention policy configurable by admin
Dependencies: FR-AM-009
Related Requirements: FR-CP-001

FR-CP-003: Audit Trail
Priority: High
Description: The system shall maintain comprehensive audit trail
Acceptance Criteria:
- All sensitive actions logged
- Log entries immutable
- Logs include: timestamp, user, action, IP, user_agent, before/after state
- Failed actions also logged
- Log retention: 1 year minimum
- Logs exportable for compliance review
- Log integrity verification (checksums)
Dependencies: FR-AM-008
Related Requirements: FR-CP-001

FR-CP-004: Consent Management
Priority: Medium
Description: The system shall manage user consent for data processing
Acceptance Criteria:
- User consent collected during registration
- Consent checkboxes for: terms of service, privacy policy, marketing emails
- User can modify consent preferences
- Consent history tracked
- Granular consent (purpose-specific)
- Consent withdrawal supported
- Consent status enforced (no processing without consent)
Dependencies: FR-UM-001
Related Requirements: FR-CP-001

3. NON-FUNCTIONAL REQUIREMENTS

3.1 Performance Requirements

NFR-PF-001: Message Delivery Performance
Priority: High
Description: Messages shall be delivered within 500ms (95th percentile)
Acceptance Criteria:
- Median latency < 200ms
- 95th percentile < 500ms
- 99th percentile < 1000ms
- Measured from send to delivery confirmation
- Performance tested with 40 concurrent users
- Performance metrics tracked and alerted

NFR-PF-002: Page Load Performance
Priority: High
Description: Web pages shall load within 2 seconds
Acceptance Criteria:
- Initial page load < 2 seconds
- Time to interactive < 3 seconds
- Measured on 3G network speed
- Lighthouse performance score > 90
- Code splitting and lazy loading implemented

NFR-PF-003: System Availability
Priority: High
Description: System shall maintain 99.5% uptime
Acceptance Criteria:
- Maximum downtime: 3.5 hours per month
- Planned maintenance announced 48 hours ahead
- Graceful degradation during partial failures
- Health check endpoint responds within 100ms
- Automatic failover for critical services

NFR-PF-004: Concurrent User Support
Priority: High
Description: System shall support 40 concurrent users
Acceptance Criteria:
- System stable with 40 WebSocket connections
- No performance degradation at capacity
- Load tested to 60 users (150% capacity)
- Resource usage monitored under load
- Queuing mechanism for over-capacity requests

NFR-PF-005: Video Call Quality
Priority: High
Description: Video calls shall maintain minimum 720p quality
Acceptance Criteria:
- Default resolution: 720p (1280x720)
- Adaptive bitrate based on bandwidth
- Minimum 25fps frame rate
- Audio codec: Opus
- Video codec: VP8 or H.264
- Call quality metrics logged

3.2 Scalability Requirements

NFR-SC-001: User Scalability
Priority: Medium
Description: System shall support up to 100 registered users
Acceptance Criteria:
- Database schema supports 100+ users
- No hard-coded user limits
- Performance testing at 100 users
- Resource usage projected for 100 users
- Graceful handling of user limit

NFR-SC-002: Storage Scalability
Priority: Medium
Description: System shall efficiently manage 160GB storage capacity
Acceptance Criteria:
- Storage monitoring and alerts at 80% capacity
- Automatic cleanup of old messages
- File compression where applicable
- Storage usage reported in admin dashboard
- Storage growth rate tracked

NFR-SC-003: Message Throughput
Priority: High
Description: System shall handle 1000 messages per minute
Acceptance Criteria:
- Message queue processes 1000 msgs/min
- No message loss under load
- Queue depth monitored
- Automatic scaling of workers (if applicable)
- Backpressure mechanism for overload

3.3 Security Requirements

NFR-SE-001: Authentication Security
Priority: High
Description: System shall use industry-standard authentication mechanisms
Acceptance Criteria:
- JWT tokens with RS256 signing
- Token expiration enforced
- Token revocation supported
- Secure token storage (httpOnly cookies)
- OWASP authentication guidelines followed

NFR-SE-002: Authorization Security
Priority: High
Description: System shall enforce role-based access control
Acceptance Criteria:
- User and admin roles defined
- Permission checks on all endpoints
- Principle of least privilege enforced
- Horizontal privilege escalation prevented
- Authorization failures logged

NFR-SE-003: Communication Security
Priority: High
Description: All communications shall be encrypted
Acceptance Criteria:
- HTTPS enforced (HTTP redirects to HTTPS)
- TLS 1.2+ only (TLS 1.0/1.1 disabled)
- Strong cipher suites configured
- HSTS header enabled
- Certificate pinning for mobile apps

NFR-SE-004: Data Security
Priority: High
Description: Sensitive data shall be protected at rest and in transit
Acceptance Criteria:
- PII encrypted in database
- E2E encryption for messages
- Secure key management
- Regular security audits
- Data sanitization on deletion

3.4 Reliability Requirements

NFR-RL-001: Data Backup
Priority: High
Description: System shall backup data regularly
Acceptance Criteria:
- Daily full database backups at 2 AM UTC
- Hourly incremental backups
- Backups retained for 7 days locally
- Weekly backups replicated geographically
- Backup integrity verified weekly
- Restore procedure tested quarterly

NFR-RL-002: Disaster Recovery
Priority: High
Description: System shall support disaster recovery
Acceptance Criteria:
- Recovery Point Objective (RPO): 1 hour
- Recovery Time Objective (RTO): 4 hours
- Database restore time: 30 minutes
- Full system restore time: 2-4 hours
- DR plan documented and tested
- Emergency contacts defined

NFR-RL-003: Error Handling
Priority: High
Description: System shall handle errors gracefully
Acceptance Criteria:
- All errors logged with stack traces
- User-friendly error messages displayed
- No sensitive data in error messages
- Automatic retry for transient errors
- Circuit breaker pattern for external services
- Error rates monitored and alerted

3.5 Usability Requirements

NFR-US-001: User Interface
Priority: High
Description: System shall provide intuitive user interface
Acceptance Criteria:
- Mobile-responsive design
- Accessibility WCAG 2.1 Level AA compliance
- Consistent design language
- Maximum 3 clicks to any feature
- Inline help and tooltips
- Loading indicators for async operations

NFR-US-002: Browser Compatibility
Priority: High
Description: Web application shall support major browsers
Acceptance Criteria:
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Graceful degradation for unsupported browsers
- Feature detection, not browser detection

NFR-US-003: Mobile Compatibility
Priority: High
Description: Android app shall support Android 10+
Acceptance Criteria:
- Minimum SDK: Android 10 (API 29)
- Target SDK: Latest stable version
- Responsive layouts for different screen sizes
- Offline support for viewing cached messages
- Background service for notifications

3.6 Maintainability Requirements

NFR-MN-001: Code Quality
Priority: Medium
Description: Code shall follow best practices and standards
Acceptance Criteria:
- ESLint/TSLint rules enforced
- Code coverage > 80%
- No critical SonarQube issues
- Code review required for all changes
- Documentation for all public APIs
- Consistent code formatting (Prettier)

NFR-MN-002: Logging
Priority: High
Description: System shall provide comprehensive logging
Acceptance Criteria:
- Structured logging (JSON format)
- Log levels: DEBUG, INFO, WARN, ERROR
- Centralized log aggregation
- Log rotation daily
- Logs retained for 30 days
- PII excluded from logs

NFR-MN-003: Monitoring
Priority: High
Description: System shall be monitored continuously
Acceptance Criteria:
- Prometheus metrics collection
- Grafana dashboards configured
- Key metrics: CPU, RAM, disk, latency, errors
- Alerting thresholds defined
- On-call rotation for alerts
- Monthly metrics review

3.7 Deployment Requirements

NFR-DP-001: Deployment Process
Priority: High
Description: System shall support automated deployment
Acceptance Criteria:
- Deployment script provided
- Zero-downtime deployment
- Automatic rollback on failure
- Database migrations automated
- Environment-specific configurations
- Deployment logs retained

NFR-DP-002: Environment Separation
Priority: High
Description: System shall maintain separate environments
Acceptance Criteria:
- Development environment (local)
- Staging environment (mirrors production)
- Production environment
- Data isolation between environments
- Promotion process defined
- Environment parity maintained

4. INTERFACE REQUIREMENTS

4.1 User Interfaces
- Web application (React/Vue.js)
- Android mobile application (React Native)
- Responsive design (mobile, tablet, desktop)
- Material-UI or Tailwind CSS framework
- Dark mode support (future)

4.2 Hardware Interfaces
- Camera access for video calls
- Microphone access for voice/video calls
- Speaker output for call audio
- File system access for file uploads/downloads
- Notification APIs for push notifications

4.3 Software Interfaces
- PostgreSQL 14 database
- Redis 7 cache and session store
- ClamAV malware scanner
- SendGrid/AWS SES email service
- Firebase Cloud Messaging (push notifications)
- Coturn STUN/TURN server
- Prometheus/Grafana monitoring

4.4 Communication Interfaces
- REST API over HTTPS
- WebSocket over WSS (Socket.io)
- WebRTC for peer-to-peer calls
- SMTP for email sending
- HTTPS for external API calls

5. SYSTEM CONSTRAINTS

5.1 Technical Constraints
- Single server deployment (no horizontal scaling)
- Maximum 100 registered users
- Maximum 40 concurrent users
- Maximum 10 simultaneous video calls
- 160GB storage capacity
- 30-day message retention
- No group video calls

5.2 Regulatory Constraints
- GDPR compliance for EU users
- Data protection regulations
- Privacy policy requirements
- User consent management
- Data retention policies

5.3 Business Constraints
- Budget: $50-60/month operational costs
- Development timeline: 8 weeks
- Single developer resource
- Open source technologies preferred
- Minimal third-party dependencies

6. ASSUMPTIONS AND DEPENDENCIES

6.1 Assumptions
- Users have reliable internet connectivity
- Users have modern browsers or Android 10+ devices
- Email service availability (99.9%)
- STUN/TURN server availability
- Third-party services maintain SLA

6.2 Dependencies
- Node.js 18 LTS runtime
- PostgreSQL 14 availability
- Redis 7 availability
- Let's Encrypt SSL certificates
- FCM service availability
- Email delivery service (SendGrid/SES)

7. ACCEPTANCE CRITERIA

7.1 Functional Acceptance
- All high-priority functional requirements implemented
- All critical user journeys functional
- No critical or high severity bugs
- Security testing passed
- Load testing passed (40 concurrent users)

7.2 Performance Acceptance
- Message delivery < 500ms (95th percentile)
- Page load < 2 seconds
- 99.5% uptime achieved
- Video calls maintain 720p quality
- System supports 40 concurrent users

7.3 Security Acceptance
- Penetration testing passed
- No high/critical vulnerabilities
- Security audit approved
- GDPR compliance verified
- Data encryption validated

7.4 Usability Acceptance
- User acceptance testing score > 4/5
- All major browsers supported
- Mobile app functional on Android 10+
- Accessibility guidelines met
- User documentation complete

8. RISKS AND MITIGATION

8.1 Technical Risks
Risk: Single point of failure (single server)
Mitigation: Regular backups, disaster recovery plan, monitoring

Risk: WebRTC NAT traversal failures
Mitigation: TURN server fallback, connection retry logic

Risk: Storage capacity exceeded
Mitigation: Monitoring alerts, automatic cleanup, storage limits

8.2 Security Risks
Risk: Data breach or unauthorized access
Mitigation: Encryption, access controls, security audits, monitoring

Risk: DDoS attacks
Mitigation: Rate limiting, firewall rules, Cloudflare (optional)

8.3 Business Risks
Risk: User adoption below targets
Mitigation: User feedback, iterative improvements, marketing

Risk: Operational costs exceed budget
Mitigation: Cost monitoring, resource optimization, usage limits

9. TRACEABILITY MATRIX

| Requirement ID | BRD Reference | Architecture Reference | Test Case ID |
|---------------|---------------|------------------------|--------------|
| FR-UM-001 | User Registration | F19 | TC-UM-001 |
| FR-UM-003 | User Login | F20 | TC-UM-003 |
| FR-MS-001 | Send Message | F1 | TC-MS-001 |
| FR-MS-002 | Group Chat | F2 | TC-MS-002 |
| FR-VC-001 | Initiate Call | F11, F12 | TC-VC-001 |
| FR-FL-001 | File Upload | F6 | TC-FL-001 |
| FR-AM-001 | Approve Registration | Admin Approval | TC-AM-001 |
| FR-SC-004 | Data Encryption | E2E Encryption | TC-SC-004 |
| FR-CP-001 | GDPR Compliance | Data Export | TC-CP-001 |

10. APPROVAL

This Functional Requirements Document has been reviewed and approved by:

Project Sponsor: _______________ Date: ___________
Product Owner: _______________ Date: ___________
Technical Lead: _______________ Date: ___________
QA Lead: _______________ Date: ___________

11. REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2024 | System Analyst | Initial version |

---

END OF DOCUMENT
