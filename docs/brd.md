BUSINESS REQUIREMENTS DOCUMENT
Simple Messenger with Video Calling (100 Users)
Version 1.0 - November 2024

SUMMARY
We're building a simple messenger app for small teams of up to 100 users. It will have text messaging and 1-to-1 video calls. Everything runs on one server to keep costs low (around $50-60 per month). Development will take 8 weeks.

PROJECT TIMELINE
Week 1-2: Backend foundation
   User authentication and authorization
   Database schema implementation
   Admin approval workflow

Week 3-4: Core messaging features
   Real-time messaging with WebSocket
   Group chat functionality
   File upload and storage

Week 5-6: Communication features
   WebRTC video/voice calling
   Push notifications
   Online status and presence

Week 7: Platform development
   Web application frontend
   Android app development

Week 8: Testing and deployment
   Load testing
   Security audit
   Bug fixes
   Production deployment

WHY WE'RE BUILDING THIS
Small organizations need an affordable way to communicate. Enterprise solutions are too expensive and complex. Most small teams just need basic messaging and video calls without all the extra features. Our target users are companies or communities with 50-100 people who want something that just works.

WHAT WE'RE BUILDING
Core Features:
   User accounts with login/registration
   Text messaging between users
   Group chats (up to 20 people)
   1-to-1 video calls
   1-to-1 voice calls
   File sharing (images, documents, videos up to 25MB)
      Supported formats: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, mp4
      Automatic malware scanning on upload
      Thumbnail generation for images
   Contact management
   Message notifications (push, email, in-app)
   Online/offline/away status
   End-to-end encryption for 1-to-1 messages and calls
   Message read receipts
   Typing indicators

Platforms:
   Web browser version
   Android app

What we're NOT building:

   Group video calls
   Screen sharing
   Payment features
   AI features
   Integrations with other tools


USER REQUIREMENTS
Regular Users need to:
   Sign up with email and password
   Wait for admin approval before accessing the app
   Send messages that arrive instantly (within 1 second)
   See when messages are delivered and read
   Make video calls with good quality (720p minimum)
   Share files easily
   Get notifications for new messages and calls
   See who's online
   Search through message history
   Block unwanted contacts
   Edit or delete their own messages within 5 minutes
   Download their data

Admin Users need to:
   Approve or reject user registration requests
   Deactivate/reactivate user accounts
   View system statistics (active users, storage usage)
   Manage user reports and blocks
   Access audit logs
   Configure system settings (message retention, file size limits)

TECHNICAL REQUIREMENTS
Performance targets:
   Support 40 users online at the same time
   Handle 10 video calls simultaneously
   Messages delivered in under 500 milliseconds
   System available 99.5% of the time (about 3.5 hours downtime per month)
   Page loads in under 2 seconds

Security requirements:
   All connections encrypted with SSL/TLS (minimum TLS 1.2)
   Passwords hashed using bcrypt (minimum 10 rounds)
   Rate limiting: 100 login attempts per minute globally, 5 per IP
   Regular automated daily backups with 7-day retention
   Input validation and sanitization to prevent XSS, SQL injection
   File uploads scanned for malware
   Session timeout after 30 minutes of inactivity
   Two-factor authentication optional for users
   Audit logging for sensitive operations

HOW IT WORKS
Everything runs on a single server with:
   4 CPU cores
   8 GB RAM
   160 GB storage
   Ubuntu Linux
   Node.js for the backend
   PostgreSQL database
   Redis for caching
   Nginx web server
For video calls, we use peer-to-peer connections. The server just helps establish the connection, then users communicate directly with each other. This saves bandwidth and gives better quality.

USER STORIES
Regular User Stories:
"As a user, I want to send messages to my colleagues and see when they've read them."

"As a user, I want to make video calls without installing complicated software."

"As a user, I want to share files quickly without using email."

"As a user, I want to create group chats for my project teams."

"As a user, I want to see who's online before I message them."

"As a user, I want to search through my message history to find important information."

"As a user, I want to receive notifications so I don't miss important messages."

"As a user, I want to block users who send me unwanted messages."

Admin User Stories:
"As an admin, I want to approve new user registrations to control who joins the platform."

"As an admin, I want to view system statistics to understand usage patterns."

"As an admin, I want to deactivate accounts that violate policies."

"As an admin, I want to see audit logs to track system changes and user activities."

LIMITATIONS
Because we're using one server, we have some limits:
   Maximum 100 users total
   Maximum 40 users online at once
   Maximum 10 video calls at the same time
   30-day message history (older messages deleted)
   160 GB total storage
   No redundancy (if server fails, service is down)

DATABASE STRUCTURE
Core tables:
   Users: id, username, email, password_hash, role (user/admin), status (pending/active/inactive),
          profile_picture, created_at, last_seen, settings
   Messages: id, sender_id, receiver_id, group_id, content, encrypted_content,
            timestamp, edited_at, deleted_at, read_at, delivered_at
   Groups: id, name, description, creator_id, created_at, max_members (20)
   GroupMembers: group_id, user_id, joined_at, role (member/admin)
   Calls: id, caller_id, receiver_id, type (voice/video), status (calling/connected/ended),
         started_at, ended_at, duration
   Contacts: id, user_id, contact_user_id, status (active/blocked), created_at
   Files: id, uploader_id, message_id, filename, file_path, file_size, mime_type,
         thumbnail_path, uploaded_at, virus_scan_status
   AuditLogs: id, user_id, action, resource_type, resource_id, ip_address, timestamp
   Notifications: id, user_id, type, content, read, created_at
   Sessions: id, user_id, token, ip_address, user_agent, expires_at

Indexes for performance:
   Messages: (receiver_id, timestamp), (sender_id, timestamp), (group_id, timestamp)
   Users: (email), (username)
   Contacts: (user_id, contact_user_id)
   Files: (uploader_id), (message_id)

API ENDPOINTS
The system will have RESTful APIs and WebSocket connections:

Authentication:
   POST /api/auth/register - New user registration
   POST /api/auth/login - User login
   POST /api/auth/logout - User logout
   POST /api/auth/refresh - Refresh access token
   POST /api/auth/forgot-password - Password reset request
   GET /api/auth/verify-email - Email verification

Users:
   GET /api/users/me - Get current user profile
   PUT /api/users/me - Update profile
   GET /api/users/:id - Get user by ID
   GET /api/users/search - Search users
   POST /api/users/status - Update online status
   DELETE /api/users/me - Delete account

Messages:
   GET /api/messages - Get message history (paginated)
   POST /api/messages - Send message
   PUT /api/messages/:id - Edit message
   DELETE /api/messages/:id - Delete message
   GET /api/messages/search - Search messages
   POST /api/messages/:id/read - Mark as read

Groups:
   GET /api/groups - List user's groups
   POST /api/groups - Create group
   GET /api/groups/:id - Get group details
   PUT /api/groups/:id - Update group
   DELETE /api/groups/:id - Delete group
   POST /api/groups/:id/members - Add member
   DELETE /api/groups/:id/members/:userId - Remove member

Contacts:
   GET /api/contacts - List contacts
   POST /api/contacts - Add contact
   DELETE /api/contacts/:id - Remove contact
   POST /api/contacts/:id/block - Block contact
   DELETE /api/contacts/:id/block - Unblock contact

Calls:
   POST /api/calls/initiate - Start call
   POST /api/calls/:id/accept - Accept call
   POST /api/calls/:id/reject - Reject call
   POST /api/calls/:id/end - End call
   GET /api/calls/history - Get call history

Files:
   POST /api/files/upload - Upload file
   GET /api/files/:id - Download file
   GET /api/files/:id/thumbnail - Get thumbnail
   DELETE /api/files/:id - Delete file

Admin:
   GET /api/admin/users - List all users
   PUT /api/admin/users/:id/approve - Approve registration
   PUT /api/admin/users/:id/deactivate - Deactivate user
   GET /api/admin/stats - System statistics
   GET /api/admin/audit-logs - Audit logs

Notifications:
   GET /api/notifications - Get notifications
   PUT /api/notifications/:id/read - Mark notification as read
   DELETE /api/notifications/:id - Delete notification

WebSocket events:
   message.new - New message received
   message.read - Message read receipt
   message.typing - User typing indicator
   user.status - User online/offline status
   call.incoming - Incoming call
   call.ended - Call ended
   notification.new - New notification

TESTING PLAN
Testing phases and scope:

Unit Testing (Week 1-6, ongoing):
   Individual functions and components
   Code coverage target: 80%
   Automated test suite runs on every commit

Integration Testing (Week 5-7):
   API endpoint testing
   Database operations
   WebSocket connections
   File upload/download flows
   Authentication and authorization

Load Testing (Week 7):
   40 concurrent users simulation
   10 simultaneous video calls
   1000 messages per minute throughput
   Database query performance under load
   Memory leak detection
   Server resource monitoring

Security Testing (Week 8):
   Penetration testing
   SQL injection attempts
   XSS vulnerability scanning
   CSRF protection validation
   Authentication bypass attempts
   Rate limiting effectiveness
   File upload security (malicious files)
   API security and JWT validation

User Acceptance Testing (Week 8):
   10 beta users for real-world usage
   Usability feedback collection
   Bug reporting and tracking
   Feature completeness verification

Platform Testing:
   Web browsers: Chrome
   Android devices: Android 10, 11, 12, 13+
   Screen sizes: Mobile (320px), Tablet (768px), Desktop (1920px)
   Network conditions: 4G, WiFi, poor connection simulation

Regression Testing:
   Automated test suite before each deployment
   Smoke tests after deployment
   Critical path testing (login, send message, make call)

Test success criteria:
   Zero critical bugs
   All unit tests passing
   Security scan shows no high/critical vulnerabilities
   Load tests meet performance targets
   UAT feedback score > 4/5

COST BREAKDOWN
Monthly operational costs (~$50-60):
   VPS Server (4 cores, 8GB RAM, 160GB SSD): $40-45/month
   Domain name: $1/month (amortized)
   SSL certificate: $0 (Let's Encrypt)
   Email service (notifications): $5-10/month
   Backup storage: $3-5/month
   Total: ~$50-60/month

One-time costs:
   Development: 8 weeks × developer rate
   Domain registration: $12/year
   Initial security audit: TBD

MONITORING AND ALERTING
System monitoring includes:
   Server resource usage (CPU, RAM, disk)
   Application performance metrics
   Database connection pool status
   Active user count and concurrent connections
   Message delivery latency
   Failed login attempts
   Error rates and exceptions
   Backup completion status

Alerts configured for:
   Server down (immediate)
   CPU usage > 80% for 5 minutes
   RAM usage > 85%
   Disk usage > 80%
   Failed backups
   Error rate spike (> 5% of requests)
   Too many failed login attempts

Tools: Prometheus + Grafana for metrics, automated email/SMS alerts

MAINTENANCE
Ongoing tasks:
   Automated daily backups at 2 AM UTC
   Weekly security updates
   Monthly server maintenance window (announced 48hrs ahead)
   Bug fixes within 48 hours for critical, 1 week for non-critical
   User support response within 24 hours
   Real-time performance monitoring via dashboard
   Monthly storage cleanup (delete messages older than 30 days)
   Quarterly security audits

DISASTER RECOVERY
Backup strategy:
   Daily full database backups
   Hourly incremental backups
   7-day retention on primary backup server
   Weekly backups replicated to separate geographic location
   Backup integrity tested weekly

Recovery procedures:
   Database restoration: 30 minutes
   Full system restoration: 2-4 hours
   Recovery Point Objective (RPO): 1 hour
   Recovery Time Objective (RTO): 4 hours

Emergency contacts and escalation procedures documented

DATA RETENTION AND COMPLIANCE
Data retention policy:
   Messages: 30 days (then automatically deleted)
   Call logs: 90 days
   User profiles: Until account deletion
   Audit logs: 1 year
   Backups: 7 days

Privacy and compliance:
   User data downloadable on request
   Account deletion within 30 days of request
   Privacy policy published and accessible
   GDPR compliance for EU users (data portability, right to deletion)
   No data sold or shared with third parties
   End-to-end encryption for sensitive communications
   Admin access logged and auditable
SUCCESS METRICS
Key Performance Indicators (KPIs):

User Adoption:
   50+ active users within first month
   70% weekly active user rate
   Average 30+ messages per user per week

Technical Performance:
   Message delivery < 500ms (95th percentile)
   99.5% uptime
   < 2 second page load time
   Video call connection success rate > 95%
   Zero data breaches

User Satisfaction:
   Net Promoter Score (NPS) > 40
   < 5% user churn rate monthly
   Average support ticket resolution in < 24 hours
   User satisfaction rating > 4/5

Business:
   Monthly operating costs stay under $60
   Development completed within 8 weeks and budget
   Zero security incidents in first 6 months

DEPLOYMENT STRATEGY
Environment setup:
   Development environment (local)
   Staging environment (mirrors production)
   Production environment

Deployment process:
   Week 7: Deploy to staging, begin internal testing
   Week 8 Day 1-3: Security audit and penetration testing
   Week 8 Day 4-5: Fix critical issues
   Week 8 Day 6: Deploy to production (off-peak hours)
   Week 8 Day 7: Monitor and hot-fix if needed

Rollout plan:
   Phase 1: Invite 10 beta users for 1 week
   Phase 2: Expand to 30 users if no critical issues
   Phase 3: Full rollout to all 100 users
   Gradual feature rollout: messaging first, then calls, then advanced features

Rollback plan:
   Database snapshots before deployment
   Previous version Docker image maintained
   Ability to rollback within 15 minutes if critical issues
   Communication plan for downtime notifications

FUTURE PLANS
After launch, we might add (prioritized):

Quarter 1:
   Desktop application (Windows, Mac)
   Admin dashboard with analytics
   Advanced search with filters

Quarter 2:
   Screen sharing in video calls
   Message reactions and emoji
   Voice messages

Quarter 3:
   Support for 200 users (server upgrade)
   Group video calls (up to 5 participants)
   Message threading

Quarter 4:
   API for integrations
   Mobile app for iOS
   Custom themes