Messenger with Video Calls - 100 Users
Document Version: 2.0
Date: November 2024
Status: Final
Scope: Limited deployment for up to 100 users

1. Executive Summary
1.1 Overview
A lightweight messenger application designed for small teams or communities of up to 100 users, featuring text messaging and 1-to-1 video calling capabilities. This solution is optimized for single-server deployment with minimal infrastructure costs.

1.2 Key Constraints
Maximum 100 registered users
1-to-1 video calls only (no group calls)
Single server deployment
Budget-conscious implementation (~$50-60/month operational costs)
Admin approval required for new user registrations
30-day message retention policy
End-to-end encryption for private communications
2. Functional Requirements
2.1 Core Features
Messaging
F1: 1-to-1 text messaging
F2: Group text chats (up to 20 participants)
F3: Message status (sent/delivered/read)
F4: Typing indicators
F5: Message history (last 30 days)
F6: File sharing (images/documents/videos up to 25MB)
   - Supported formats: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, mp4
   - Automatic malware scanning on upload
   - Thumbnail generation for images
F7: Emoji support
F8: Message editing (5-minute window)
F9: Message deletion
F10: Push notifications (push, email, in-app)
Video Calling
F11: 1-to-1 video calls only (720p minimum quality)
F12: 1-to-1 voice calls
F13: Mute/unmute audio
F14: Enable/disable video
F15: Call history
F16: Incoming call notifications
F17: Network quality indicator
F18: End-to-end encryption for calls

User Management
F19: User registration (pending admin approval)
F20: User login with session management (30-min timeout)
F21: Optional two-factor authentication (2FA)
F22: Profile management (name, avatar, status)
F23: Contact list (add/remove/block)
F24: Online/offline/away status
F25: Password reset
F26: User data download (GDPR compliance)
F27: Account deletion

Admin Features
F28: Approve/reject user registration requests
F29: Deactivate/reactivate user accounts
F30: View system statistics (active users, storage, performance)
F31: Manage user reports and blocks
F32: Access audit logs
F33: Configure system settings (retention, file limits)
3. Technical Specifications
3.1 Single Server Configuration
Recommended Server Specs
YAML

Option 1: VPS (Recommended)
  Provider: DigitalOcean/Vultr/Linode
  CPU: 4 vCPUs
  RAM: 8 GB
  Storage: 160 GB SSD
  Bandwidth: 4 TB/month
  Network: 1 Gbps
  Cost: $40-60/month

Option 2: Minimal VPS
  CPU: 2 vCPUs
  RAM: 4 GB
  Storage: 80 GB SSD
  Bandwidth: 3 TB/month
  Cost: $20-30/month
Load Capacity Analysis
YAML

Expected Load (100 users):
  Peak Concurrent Users: 30-40 (30-40%)
  Concurrent WebSocket Connections: 40
  Messages/day: 5,000-10,000
  Concurrent Video Calls: 5-10 maximum
  File Uploads/day: 100-200
  Storage Growth: ~5 GB/month
  
Resource Usage:
  CPU Usage: 20-40% average, 60% peak
  RAM Usage: 3-4 GB
  Bandwidth: 500 GB/month average
  Storage: 20 GB (first year)
4. Architecture Design
4.1 Simplified Architecture
text

┌─────────────────────────────────────────────────┐
│              Single Server                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │       Nginx (Reverse Proxy)              │  │
│  │       - SSL/TLS Termination (TLS 1.2+)   │  │
│  │       - Static Files & Media Serving     │  │
│  │       - Rate Limiting (5 req/min per IP) │  │
│  └────────────────┬─────────────────────────┘  │
│                   │                             │
│  ┌────────────────▼─────────────────────────┐  │
│  │       Application Server                 │  │
│  │       Node.js 18 LTS / Express.js        │  │
│  │       - REST API (50+ endpoints)         │  │
│  │       - WebSocket Server (Socket.io)     │  │
│  │       - WebRTC Signaling                 │  │
│  │       - Admin API & Approval Workflow    │  │
│  │       - E2E Encryption (libsodium)       │  │
│  │       - Session Management (JWT + Redis) │  │
│  └────────────────┬─────────────────────────┘  │
│                   │                             │
│  ┌────────────────▼─────────────────────────┐  │
│  │       Background Services                │  │
│  │       - Email Service (notifications)    │  │
│  │       - Push Notification Service        │  │
│  │       - Malware Scanner (ClamAV)         │  │
│  │       - Image Thumbnail Generator        │  │
│  │       - Backup Service (daily/hourly)    │  │
│  │       - Message Cleanup (30-day policy)  │  │
│  └────────────────┬─────────────────────────┘  │
│                   │                             │
│  ┌────────────────▼─────────────────────────┐  │
│  │       Data Layer                         │  │
│  │       - PostgreSQL 14 (primary DB)       │  │
│  │       - Redis 7 (cache/sessions/queue)   │  │
│  │       - File System (encrypted media)    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │       STUN/TURN Server (Coturn)          │  │
│  │       - NAT traversal                    │  │
│  │       - P2P connection fallback          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │       Monitoring & Alerting              │  │
│  │       - Prometheus (metrics)             │  │
│  │       - Grafana (dashboards)             │  │
│  │       - PM2 (process management)         │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
4.2 Technology Stack
JavaScript

{
  "backend": {
    "runtime": "Node.js 18 LTS",
    "framework": "Express.js",
    "realtime": "Socket.io",
    "webrtc": "simple-peer or mediasoup-client",
    "authentication": "Passport.js + JWT",
    "encryption": "libsodium (E2E) + crypto (at-rest)",
    "2fa": "speakeasy (TOTP)",
    "validation": "joi or express-validator"
  },

  "database": {
    "primary": "PostgreSQL 14",
    "cache": "Redis 7",
    "sessions": "Redis with express-session",
    "orm": "Sequelize or Prisma"
  },

  "security": {
    "password_hashing": "bcrypt (10+ rounds)",
    "rate_limiting": "express-rate-limit",
    "malware_scanning": "ClamAV",
    "input_sanitization": "DOMPurify, validator.js",
    "csrf_protection": "csurf",
    "helmet": "helmet.js (security headers)"
  },

  "notifications": {
    "email": "SendGrid or AWS SES ($5-10/month)",
    "push": "Firebase Cloud Messaging (FCM)",
    "in_app": "Socket.io events"
  },

  "file_handling": {
    "upload": "multer",
    "thumbnail": "sharp (image processing)",
    "storage": "local filesystem with encryption",
    "formats": "jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, mp4"
  },

  "frontend": {
    "web": "React or Vue.js",
    "mobile": "React Native (Android initially)",
    "state_management": "Redux or Zustand",
    "ui_framework": "Material-UI or Tailwind CSS"
  },

  "infrastructure": {
    "os": "Ubuntu 22.04 LTS",
    "containerization": "Docker (optional)",
    "proxy": "Nginx",
    "ssl": "Let's Encrypt (certbot)",
    "process_manager": "PM2",
    "monitoring": "Prometheus + Grafana",
    "logging": "Winston + Morgan",
    "backup": "pg_dump + rsync to remote location"
  },

  "background_jobs": {
    "queue": "Bull (Redis-based)",
    "scheduler": "node-cron",
    "jobs": [
      "message_cleanup (daily)",
      "backup_database (hourly incremental, daily full)",
      "virus_scan (on upload)",
      "thumbnail_generation (on image upload)",
      "email_notifications (queued)",
      "audit_log_rotation (monthly)"
    ]
  }
}
5. Implementation Approach
5.1 P2P Video Architecture (Recommended)
YAML

Why P2P for 100 users:
  - Server only handles signaling
  - Direct peer connections for video
  - Minimal server bandwidth usage
  - Better video quality
  - Lower latency

Server Role:
  - WebRTC signaling only
  - STUN for NAT traversal
  - TURN as fallback (10-15% of calls)
  - Session management
5.2 Video Call Flow
mermaid

sequenceDiagram
    User A->>Server: Initiate Call
    Server->>User B: Call Notification
    User B->>Server: Accept Call
    Server->>User A: Call Accepted
    User A->>Server: WebRTC Offer
    Server->>User B: Forward Offer
    User B->>Server: WebRTC Answer
    Server->>User A: Forward Answer
    User A<-->User B: P2P Video Stream
    Note over Server: Server free after connection established
6. Database Schema (Simplified)
SQL

-- Complete schema aligned with BRD requirements

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'user' or 'admin'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'inactive'
    avatar_url VARCHAR(255),
    profile_picture VARCHAR(255),
    bio TEXT,
    last_seen TIMESTAMP,
    online_status VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'away'
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    content TEXT,
    encrypted_content TEXT, -- E2E encrypted content
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'image', 'video'
    file_id INTEGER REFERENCES files(id),
    is_read BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    read_at TIMESTAMP,
    delivered_at TIMESTAMP
);

CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    max_members INTEGER DEFAULT 20,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'member' or 'admin'
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE calls (
    id SERIAL PRIMARY KEY,
    caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    call_type VARCHAR(10) NOT NULL, -- 'audio' or 'video'
    status VARCHAR(20) DEFAULT 'calling', -- 'calling', 'connected', 'ended', 'rejected', 'missed'
    duration INTEGER DEFAULT 0, -- seconds
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'blocked'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, contact_user_id)
);

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    uploader_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL, -- bytes
    mime_type VARCHAR(100) NOT NULL,
    thumbnail_path VARCHAR(500),
    virus_scan_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'clean', 'infected', 'error'
    virus_scan_date TIMESTAMP,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'user_login', 'user_approved', 'user_deactivated', etc.
    resource_type VARCHAR(50), -- 'user', 'message', 'file', 'group'
    resource_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'message', 'call', 'mention', 'admin_action'
    title VARCHAR(255),
    content TEXT,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_group ON messages(group_id, created_at DESC);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_calls_caller ON calls(caller_id, created_at DESC);
CREATE INDEX idx_calls_recipient ON calls(recipient_id, created_at DESC);
CREATE INDEX idx_calls_status ON calls(status);

CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_pair ON contacts(user_id, contact_user_id);

CREATE INDEX idx_files_uploader ON files(uploader_id);
CREATE INDEX idx_files_message ON files(message_id);
CREATE INDEX idx_files_scan_status ON files(virus_scan_status);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE INDEX idx_groups_creator ON groups(creator_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
7. API Endpoints (Complete Specification)
YAML

Authentication:
  POST   /api/auth/register              # New user registration (pending status)
  POST   /api/auth/login                 # User login (returns JWT)
  POST   /api/auth/logout                # User logout
  POST   /api/auth/refresh               # Refresh access token
  POST   /api/auth/forgot-password       # Password reset request
  POST   /api/auth/reset-password        # Reset password with token
  GET    /api/auth/verify-email          # Email verification
  POST   /api/auth/2fa/enable            # Enable 2FA
  POST   /api/auth/2fa/verify            # Verify 2FA token
  POST   /api/auth/2fa/disable           # Disable 2FA

Users:
  GET    /api/users/me                   # Get current user profile
  PUT    /api/users/me                   # Update profile
  DELETE /api/users/me                   # Delete account
  GET    /api/users/:id                  # Get user by ID
  GET    /api/users/search               # Search users (query params)
  POST   /api/users/status               # Update online status
  GET    /api/users/data-export          # Download user data (GDPR)

Messages:
  GET    /api/messages                   # Get message history (paginated)
  POST   /api/messages                   # Send message
  PUT    /api/messages/:id               # Edit message (within 5 min)
  DELETE /api/messages/:id               # Delete message
  GET    /api/messages/search            # Search messages
  POST   /api/messages/:id/read          # Mark as read

Groups:
  GET    /api/groups                     # List user's groups
  POST   /api/groups                     # Create group
  GET    /api/groups/:id                 # Get group details
  PUT    /api/groups/:id                 # Update group
  DELETE /api/groups/:id                 # Delete group
  POST   /api/groups/:id/members         # Add member
  DELETE /api/groups/:id/members/:userId # Remove member
  GET    /api/groups/:id/messages        # Get group messages

Contacts:
  GET    /api/contacts                   # List contacts
  POST   /api/contacts                   # Add contact
  DELETE /api/contacts/:id               # Remove contact
  POST   /api/contacts/:id/block         # Block contact
  DELETE /api/contacts/:id/block         # Unblock contact

Video/Voice Calls:
  POST   /api/calls/initiate             # Start call
  POST   /api/calls/:id/accept           # Accept call
  POST   /api/calls/:id/reject           # Reject call
  POST   /api/calls/:id/end              # End call
  GET    /api/calls/history              # Call history

Files:
  POST   /api/files/upload               # Upload file (max 25MB)
  GET    /api/files/:id                  # Download file
  GET    /api/files/:id/thumbnail        # Get thumbnail (images)
  DELETE /api/files/:id                  # Delete file

Notifications:
  GET    /api/notifications              # Get notifications
  PUT    /api/notifications/:id/read     # Mark notification as read
  DELETE /api/notifications/:id          # Delete notification
  PUT    /api/notifications/read-all     # Mark all as read

Admin Endpoints (require admin role):
  GET    /api/admin/users                # List all users (paginated)
  GET    /api/admin/users/pending        # List pending registrations
  PUT    /api/admin/users/:id/approve    # Approve registration
  PUT    /api/admin/users/:id/reject     # Reject registration
  PUT    /api/admin/users/:id/deactivate # Deactivate user
  PUT    /api/admin/users/:id/activate   # Reactivate user
  GET    /api/admin/stats                # System statistics
  GET    /api/admin/audit-logs           # Audit logs (paginated)
  GET    /api/admin/reports              # User reports
  PUT    /api/admin/settings             # Update system settings

WebSocket Events (Socket.io):
  Client -> Server:
    - message.send                       # Send real-time message
    - message.typing                     # Typing indicator
    - user.status.update                 # Update online status
    - call.signal                        # WebRTC signaling

  Server -> Client:
    - message.new                        # New message received
    - message.read                       # Message read receipt
    - message.delivered                  # Message delivered
    - message.typing                     # User typing indicator
    - user.status.changed                # User online/offline/away
    - call.incoming                      # Incoming call
    - call.accepted                      # Call accepted
    - call.rejected                      # Call rejected
    - call.ended                         # Call ended
    - call.signal                        # WebRTC signaling response
    - notification.new                   # New notification
8. Security Architecture
8.1 Security Layers

Authentication & Authorization:
  - JWT tokens with 24-hour expiration
  - Refresh tokens with 7-day expiration
  - bcrypt password hashing (10+ rounds)
  - Optional 2FA using TOTP (Time-based One-Time Password)
  - Session management with 30-minute inactivity timeout
  - Role-based access control (RBAC): user, admin

Data Encryption:
  - TLS 1.2+ for all connections (Let's Encrypt SSL)
  - End-to-end encryption for 1-to-1 messages (libsodium)
  - At-rest encryption for sensitive file uploads
  - Encrypted file storage for media
  - Secure key exchange using Diffie-Hellman

Input Validation & Sanitization:
  - Server-side validation for all inputs
  - SQL injection prevention (parameterized queries)
  - XSS protection (input sanitization)
  - CSRF tokens for state-changing operations
  - File upload validation (type, size, content)

Rate Limiting:
  - Global: 100 login attempts/minute
  - Per IP: 5 login attempts/minute
  - API endpoints: 100 requests/minute per user
  - File upload: 10 uploads/hour per user
  - Message sending: 100 messages/minute per user

Malware Protection:
  - ClamAV virus scanning on file upload
  - Quarantine infected files
  - Supported file types whitelist
  - Maximum file size enforcement (25MB)

Audit & Monitoring:
  - All admin actions logged
  - Failed login attempts tracked
  - IP address and user agent logging
  - Suspicious activity alerts
  - GDPR-compliant data access logs

8.2 Admin Approval Workflow

User Registration Flow:
  1. User submits registration form
  2. Account created with status='pending'
  3. Notification sent to all admins
  4. Admin reviews registration request
  5. Admin approves or rejects:
     - Approved: status='active', welcome email sent
     - Rejected: account deleted, rejection email sent
  6. User can login only after approval

Admin Dashboard Features:
  - Pending registrations list
  - User management (activate/deactivate)
  - System statistics (users, storage, performance)
  - Audit log viewer
  - User reports and blocks management
  - System settings configuration

9. Performance Optimization
9.1 Server Optimizations
Bash

# System limits for 100 users
ulimit -n 4096                    # File descriptors
net.core.somaxconn = 1024         # Socket connections
vm.swappiness = 10                # Reduce swap usage

# Nginx optimizations
worker_processes 2;
worker_connections 1024;
keepalive_timeout 65;
gzip on;
client_max_body_size 25M;         # Max file upload size

# Node.js optimizations
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048"

# PostgreSQL tuning
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Redis configuration
maxmemory 512mb
maxmemory-policy allkeys-lru
9.2 Application Optimizations
JavaScript

// Database connection pooling
const dbPool = {
  max: 20,          // 100 users don't need more
  min: 5,
  idle: 10000,
  acquire: 30000,
  evict: 1000
};

// Redis caching strategy
const cacheConfig = {
  userSessions: '30m',      // Session timeout
  userProfiles: '10m',
  messageList: '5m',
  contactList: '30m',
  onlineStatus: '1m',
  groupMembers: '15m'
};

// WebSocket optimization
const socketConfig = {
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,   // 1MB
  perMessageDeflate: true,
  transports: ['websocket', 'polling'],
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
};

// Message delivery optimization
const messageConfig = {
  batchSize: 50,            // Messages per page
  deliveryTimeout: 500,     // Target delivery time (ms)
  retryAttempts: 3,
  retryDelay: 1000
};

// File upload optimization
const uploadConfig = {
  maxFileSize: 25 * 1024 * 1024,  // 25MB
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'video/mp4'
  ],
  thumbnailSize: { width: 200, height: 200 },
  virusScanTimeout: 30000   // 30 seconds
};
10. Deployment Plan
10.1 Deployment Timeline (Aligned with BRD)

Week 1-2: Backend Foundation
  - Server provisioning and OS setup
  - Database schema implementation
  - Authentication system (JWT, bcrypt)
  - Admin approval workflow
  - Session management

Week 3-4: Core Messaging Features
  - Real-time messaging with Socket.io
  - Group chat functionality
  - Message edit/delete (5-min window)
  - File upload with malware scanning
  - E2E encryption for messages

Week 5-6: Communication Features
  - WebRTC video/voice calling implementation
  - STUN/TURN server configuration
  - Push notification service (FCM)
  - Email service integration (SendGrid/SES)
  - Online presence and typing indicators

Week 7: Platform Development & Testing
  - Web application frontend
  - Android app development
  - Load testing (40 concurrent users)
  - Integration testing
  - Deploy to staging environment

Week 8: Security & Production Deployment
  - Security audit and penetration testing
  - Fix critical vulnerabilities
  - Monitoring setup (Prometheus + Grafana)
  - Backup system configuration
  - Production deployment
  - Beta testing with 10 users

10.2 Deployment Script
Bash

#!/bin/bash
# Production deployment script for 100-user messenger

set -e  # Exit on error

echo "=== Messenger Deployment Script ==="

# 1. System Update and Dependencies
echo "Installing system dependencies..."
apt update && apt upgrade -y
apt install -y \
  nodejs npm \
  postgresql-14 postgresql-contrib \
  redis-server \
  nginx \
  certbot python3-certbot-nginx \
  clamav clamav-daemon \
  fail2ban \
  ufw

# 2. Security: Firewall Setup
echo "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/udp  # TURN server
ufw --force enable

# 3. Database Setup
echo "Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE DATABASE messenger;
CREATE USER messenger_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE messenger TO messenger_user;
ALTER USER messenger_user WITH SUPERUSER;
EOF

# Run migrations
sudo -u postgres psql messenger < /var/www/messenger/database/schema.sql

# 4. Redis Setup
echo "Configuring Redis..."
sed -i 's/# maxmemory <bytes>/maxmemory 512mb/' /etc/redis/redis.conf
sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl restart redis-server

# 5. ClamAV (Malware Scanner) Setup
echo "Setting up ClamAV..."
systemctl stop clamav-freshclam
freshclam
systemctl start clamav-freshclam
systemctl enable clamav-daemon

# 6. Application Setup
echo "Deploying application..."
cd /var/www
git clone [repository] messenger
cd messenger
npm install --production
npm run build

# Create uploads directory with encryption
mkdir -p /var/www/messenger/uploads/{temp,files,thumbnails}
chmod 750 /var/www/messenger/uploads

# 7. Environment Configuration
cat > /var/www/messenger/.env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://messenger_user:secure_password_here@localhost:5432/messenger
REDIS_URL=redis://localhost:6379
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your_sendgrid_api_key
FCM_SERVER_KEY=your_fcm_key
DOMAIN=yourdomain.com
MAX_FILE_SIZE=25000000
UPLOADS_DIR=/var/www/messenger/uploads
EOF

# 8. PM2 Process Manager
echo "Setting up PM2..."
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# 9. Nginx Configuration
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/messenger <<'NGINX'
upstream backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 25M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://backend;
        include proxy_params;
    }

    location /api {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        root /var/www/messenger/client/build;
        try_files $uri /index.html;
    }
}
NGINX

ln -s /etc/nginx/sites-available/messenger /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# 10. SSL Certificate
echo "Setting up SSL certificate..."
certbot --nginx -d yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com

# 11. TURN Server Setup
echo "Setting up TURN server..."
apt install -y coturn
cat > /etc/turnserver.conf <<EOF
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=$(openssl rand -base64 32)
realm=yourdomain.com
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/yourdomain.com/privkey.pem
no-tlsv1
no-tlsv1_1
EOF

systemctl enable coturn
systemctl start coturn

# 12. Monitoring Setup (Prometheus + Grafana)
echo "Setting up monitoring..."
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar -xvf prometheus-2.40.0.linux-amd64.tar.gz
mv prometheus-2.40.0.linux-amd64 /opt/prometheus

# Prometheus config
cat > /opt/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'messenger'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
EOF

# Create Prometheus service
cat > /etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus
After=network.target

[Service]
Type=simple
ExecStart=/opt/prometheus/prometheus --config.file=/opt/prometheus/prometheus.yml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start prometheus
systemctl enable prometheus

# 13. Backup Configuration
echo "Setting up automated backups..."
cat > /usr/local/bin/messenger-backup.sh <<'BACKUP'
#!/bin/bash
# Backup script

BACKUP_DIR="/backup/messenger"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
pg_dump messenger > $BACKUP_DIR/db_$DATE.sql

# File uploads backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/messenger/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

# Sync to remote backup location (configure rsync)
# rsync -avz $BACKUP_DIR remote_server:/backups/
BACKUP

chmod +x /usr/local/bin/messenger-backup.sh

# Schedule backups
echo "0 2 * * * /usr/local/bin/messenger-backup.sh" | crontab -

# 14. Message Cleanup Job (30-day retention)
cat > /usr/local/bin/message-cleanup.sh <<'CLEANUP'
#!/bin/bash
psql messenger -c "DELETE FROM messages WHERE created_at < NOW() - INTERVAL '30 days';"
CLEANUP

chmod +x /usr/local/bin/message-cleanup.sh
echo "0 3 * * * /usr/local/bin/message-cleanup.sh" | crontab -

echo "=== Deployment Complete ==="
echo "Next steps:"
echo "1. Update .env file with actual API keys"
echo "2. Create first admin user"
echo "3. Test the application"
echo "4. Configure monitoring alerts"
11. Cost Analysis (Aligned with BRD)
11.1 Infrastructure Costs
YAML

Monthly Operational Costs:
  VPS Server (4 vCPU, 8GB RAM, 160GB SSD):  $40-45
  Domain Name (amortized):                   $1
  SSL Certificate (Let's Encrypt):           $0
  Email Service (SendGrid/SES):              $5-10
  Push Notifications (FCM):                  $0
  Backup Storage:                            $3-5
  Total:                                     $49-61/month

Annual Cost:                                 $588-732

Per User Cost (100 users):                   $0.49-0.61/month

One-time Costs:
  Domain registration:                       $12/year
  Initial security audit:                    $500-1000
  Development (8 weeks):                     Variable

11.2 Development Effort
YAML

Development Timeline (1 Full-Stack Developer):
  Week 1-2:   Backend foundation, auth, admin workflow
  Week 3-4:   Messaging, groups, file handling, E2E encryption
  Week 5-6:   WebRTC calls, notifications, presence
  Week 7:     Frontend (web + Android), integration testing
  Week 8:     Security audit, deployment, monitoring

Total: 8 weeks for production-ready MVP

Estimated Development Hours:
  Backend:             120 hours
  Frontend (Web):       80 hours
  Mobile (Android):     60 hours
  Testing:              40 hours
  DevOps/Deployment:    30 hours
  Security:             20 hours
  Total:               350 hours
12. Monitoring & Maintenance (Aligned with BRD)
12.1 Monitoring Setup (Prometheus + Grafana)

System Metrics Monitored:
  - Server resource usage (CPU, RAM, disk)
  - Application performance metrics
  - Database connection pool status
  - Active user count and concurrent connections
  - Message delivery latency
  - Failed login attempts
  - Error rates and exceptions
  - Backup completion status
  - Video call success/failure rates

Alert Thresholds:
  - Server down (immediate alert)
  - CPU usage > 80% for 5 minutes
  - RAM usage > 85%
  - Disk usage > 80%
  - Failed backups
  - Error rate spike (> 5% of requests)
  - Too many failed login attempts (> 10/min from single IP)
  - Message delivery latency > 2 seconds
  - Database connection pool exhausted

JavaScript

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      diskSpace: await checkDiskSpace(),
      memory: process.memoryUsage(),
      activeUsers: await getActiveUserCount(),
      messageQueueSize: await getMessageQueueSize()
    }
  };

  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});

// Prometheus metrics
const promClient = require('prom-client');
const register = new promClient.Registry();

const messageCounter = new promClient.Counter({
  name: 'messages_sent_total',
  help: 'Total number of messages sent',
  registers: [register]
});

const callDuration = new promClient.Histogram({
  name: 'call_duration_seconds',
  help: 'Duration of video/voice calls',
  buckets: [30, 60, 120, 300, 600, 1800, 3600],
  registers: [register]
});

const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of currently active users',
  registers: [register]
});

// PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

12.2 Backup Strategy (Aligned with BRD)
Bash

# Hourly incremental backup
0 * * * * /usr/local/bin/messenger-backup-incremental.sh

# Daily full database backup at 2 AM UTC
0 2 * * * /usr/local/bin/messenger-backup.sh

# Weekly remote replication to geographic location
0 4 * * 0 rsync -avz /backup/messenger remote_server:/backups/

# Backup integrity test (weekly)
0 5 * * 0 /usr/local/bin/test-backup-integrity.sh

# Keep 7 days of local backups
0 6 * * * find /backup/messenger -name "*.sql" -mtime +7 -delete

Bash

# Backup integrity test script
#!/bin/bash
LATEST_BACKUP=$(ls -t /backup/messenger/db_*.sql | head -1)
TEMP_DB="messenger_test_restore"

# Create test database
sudo -u postgres createdb $TEMP_DB

# Attempt restore
if sudo -u postgres psql $TEMP_DB < $LATEST_BACKUP; then
  echo "Backup integrity: OK"
  sudo -u postgres dropdb $TEMP_DB
  exit 0
else
  echo "Backup integrity: FAILED"
  # Send alert to admin
  exit 1
fi

12.3 Maintenance Tasks

Daily (Automated):
  - Database backups (2 AM UTC)
  - Log rotation
  - Message cleanup (30-day retention)
  - Temporary file cleanup
  - Security updates check

Weekly (Automated):
  - Full system backup to remote location
  - Backup integrity verification
  - Disk space analysis
  - Performance metrics review

Monthly (Manual):
  - Storage cleanup (old deleted messages)
  - Security patch application
  - Server maintenance window (announced 48hrs ahead)
  - Review audit logs for anomalies

Quarterly (Manual):
  - Security audit
  - Performance optimization review
  - Dependency updates
  - Disaster recovery drill

12.4 Disaster Recovery Procedures

Recovery Point Objective (RPO): 1 hour
Recovery Time Objective (RTO): 4 hours

Database Restoration:
  1. Stop application server
  2. Create new database
  3. Restore from latest backup
  4. Apply incremental backups if available
  5. Verify data integrity
  6. Restart application
  Estimated time: 30 minutes

Full System Restoration:
  1. Provision new server (if needed)
  2. Install dependencies
  3. Restore application code
  4. Restore database
  5. Restore file uploads
  6. Restore configuration
  7. Update DNS if needed
  8. Test all functionality
  Estimated time: 2-4 hours

Emergency Contacts:
  - System Admin: [phone/email]
  - Database Admin: [phone/email]
  - Security Lead: [phone/email]
  - Management: [phone/email]
12. Security Considerations
YAML

Essential Security Measures:
  - HTTPS only (Let's Encrypt SSL)
  - Password hashing (bcrypt)
  - Rate limiting (100 requests/minute)
  - Input validation
  - SQL injection prevention
  - XSS protection
  - CORS configuration
  - JWT token expiration (24h)
  - File upload restrictions
  - Basic DDoS protection (Cloudflare free tier)
13. Conclusion
This configuration is perfectly suitable for 100 users with 1-to-1 video calling:

✅ Advantages:

Very cost-effective ($50-60/month)
Simple to deploy and maintain
Excellent performance for user count
Room for growth (can handle 200-300 users)
P2P video reduces server load
Single server simplifies management
⚠️ Limitations:

No redundancy (single point of failure)
Manual scaling required
Limited to regional deployment
Basic monitoring only
Recommendation: This is an ideal setup for small organizations, communities, or pilot deployments. The infrastructure can easily handle 2-3x the specified load, providing room for growth.