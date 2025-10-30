---
alwaysApply: true
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Messenger with Video Calls** - A lightweight messenger application for small teams (up to 100 users) featuring text messaging and 1-to-1 video calling. Single-server deployment optimized for minimal infrastructure costs ($50-60/month operational).

### Key Constraints
- Maximum 100 registered users
- 1-to-1 video/voice calls only (no group calls)
- Single server deployment
- Admin approval required for new user registrations
- 30-day message retention policy
- End-to-end encryption for private communications
- use only english in code and documentation

### Key Documents
- [docs/brd.md](docs/brd.md) - Business Requirements
- [docs/frd.md](docs/frd.md) - Functional Requirements 
- [docs/api-spec.md](docs/api-spec.md) - API specification and endpoints
- [docs/arch.md](docs/arch.md) - Architecture (technology stack, database schema, deployment)
- [docs/CODE_GUIDELINES.md](docs/CODE_GUIDELINES.md) - Mandatory code patterns and best practices
- [docs/UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) - Telegram-inspired design system, shadcn/ui components
- [docs/ROADMAP.md](docs/ROADMAP.md) - 8-week development plan (355 tasks, single or multi-developer)
- [docs/test-cases/](docs/test-cases/) - 350+ test scenarios across 6 files

## User Preferences

- **Communication Style**: Direct, expert level. Code and explanations without "here's how you can..." fluff.
- **Environment**: Windows
- **Approach**: Brevity, anticipating needs, treating me as an expert, arguments are more important than authority.
- **Safety**: When updating the codebase, be 100% sure that nothing will break.

## Architecture Overview

### Technology Stack

**Backend:**
- Runtime: Node.js 18+ / Express.js (ES modules)
- Database: PostgreSQL 15 + Redis 7 (cache/sessions/queue)
- Real-time: Socket.io (WebSocket), WebRTC (P2P video/audio with STUN/TURN)
- Authentication: JWT (access 7d, refresh 30d) - no Passport.js
- Encryption: bcryptjs (passwords), libsodium (E2E messages)
- Validation: Joi + express-validator
- Background Jobs: Bull (Redis-based queue) + node-cron
- File Handling: multer + sharp (thumbnails) + ClamAV (malware scanning)
- Email: nodemailer (SMTP)

**Frontend:**
- Web: React 18 + TypeScript + Vite
- UI: shadcn/ui (Radix UI + Tailwind CSS)
- State: React Context
- API: Axios + Socket.io-client
- Routing: React Router v6
- Mobile: React Native (Android 10+) - separate project

**Infrastructure:**
- OS: Ubuntu 22.04 LTS
- Containers: Docker + Docker Compose
- Proxy: Nginx (reverse proxy, SSL termination, rate limiting)
- SSL: Let's Encrypt (certbot)
- Process Manager: PM2
- Monitoring: Prometheus + Grafana
- Logging: Winston + Morgan

### Quick Start (Windows)

**Fastest way to start both servers:**
```bash
start.bat                          # Starts backend (port 4000) + frontend (port 3000)
```

**Important URLs:**
- Backend API: http://localhost:4000
- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:4000/api-docs
- Health Check: http://localhost:4000/health

**Docker (Backend + Services):**
```bash
cd backend
docker-compose up                  # PostgreSQL, Redis, ClamAV, Backend
docker-compose up -d               # Run in background
docker-compose logs -f app         # Follow backend logs
docker-compose down                # Stop all services

# Execute commands in containers
docker-compose exec app npm test
docker-compose exec app npm run migrate
docker-compose exec postgres psql -U messenger -d messenger
docker-compose exec redis redis-cli -a messenger_redis_password
```

**Backend (Local Development):**
```bash
cd backend
npm install                        # First time only
npm run dev                        # Development with nodemon (port 4000)
npm start                          # Production mode

# Database
npm run migrate                    # Run migrations
npm run migrate:undo               # Rollback migration
npm run seed                       # Seed test data

# Testing
npm test                           # All unit tests
npm run test:watch                 # Watch mode
npm run test:coverage              # Coverage report
npm run test:integration           # Integration tests
npm run test:all                   # All tests (unit + integration)

# Linting & Formatting
npm run lint                       # ESLint
npm run lint:fix                   # Auto-fix issues
npm run format                     # Prettier formatting
```

**Frontend (Local Development):**
```bash
cd frontend
npm install                        # First time only
npm run dev                        # Vite dev server (port 3000)
npm run build                      # Production build
npm run build:dev                  # Development build
npm run preview                    # Preview production build
npm run lint                       # ESLint
```

**Manual Testing Scripts:**
```bash
# Comprehensive API testing
test-all-api-endpoints-enhanced.bat     # Full API test suite
api-test-complete-fixed-v2.bat          # Fixed test runner

# Specific feature tests
test-file-upload.ps1                    # File upload testing
test-password-change.ps1                # Password change flow

# Test data creation
node create-test-users.js               # Create test users
```

## Database Schema (Core Tables)

### Users
```sql
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',  -- 'user' or 'admin'
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'active', 'inactive'
  avatar_url VARCHAR(255),
  online_status VARCHAR(20) DEFAULT 'offline',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  settings JSONB,
  created_at TIMESTAMP,
  last_seen TIMESTAMP
)
-- Indexes: email, username, status, role
```

### Messages
```sql
messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER → users(id),
  recipient_id INTEGER → users(id),
  group_id INTEGER → groups(id),
  content TEXT,
  encrypted_content TEXT,  -- E2E encrypted
  message_type VARCHAR(20) DEFAULT 'text',
  file_id INTEGER → files(id),
  is_read BOOLEAN DEFAULT FALSE,
  is_delivered BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP  -- Soft delete
)
-- Indexes: (sender_id, created_at), (recipient_id, created_at), (group_id, created_at)
```

### Calls
```sql
calls (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER → users(id),
  recipient_id INTEGER → users(id),
  call_type VARCHAR(10),  -- 'audio' or 'video'
  status VARCHAR(20),  -- 'calling', 'connected', 'ended', 'rejected', 'missed'
  duration INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP
)
-- Indexes: (caller_id, created_at), (recipient_id, created_at), status
```

### Files
```sql
files (
  id SERIAL PRIMARY KEY,
  uploader_id INTEGER → users(id),
  message_id INTEGER → messages(id),
  filename VARCHAR(255),
  file_path VARCHAR(500),
  file_size BIGINT,
  mime_type VARCHAR(100),
  thumbnail_path VARCHAR(500),
  virus_scan_status VARCHAR(20) DEFAULT 'pending',
  uploaded_at TIMESTAMP
)
-- Allowed types: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, mp4
-- Max size: 25MB
```

## Code Architecture

### Backend Structure (Actual Implementation)
```
backend/src/
├── app.js               # Express app configuration
├── server.js            # Server entry point
├── config/              # DB, Redis, environment config
├── controllers/         # Request handlers (thin layer)
│   ├── authController.js
│   ├── adminController.js
│   ├── groupsController.js
│   ├── notificationController.js
│   └── ...
├── services/            # Business logic
│   ├── messageService.js
│   ├── fileUploadService.js
│   ├── websocket.js     # Socket.io event handlers
│   ├── encryptionService.js
│   ├── emailService.js
│   └── ...
├── middleware/          # Auth, rate limiting, validation
├── models/              # Sequelize models
├── routes/              # API routes
├── jobs/                # Background jobs
└── utils/               # Helpers, logger, cache

tests/
├── unit/                # Unit tests
├── integration/         # API integration tests
└── setup.js             # Test configuration
```

### Frontend Structure (Actual Implementation)
```
frontend/src/
├── App.tsx              # Main app component
├── main.tsx             # Entry point
├── components/          # UI components (shadcn/ui + custom)
├── pages/               # Route pages (Login, Chat, Settings, Admin)
├── services/            # API clients
├── hooks/               # Custom React hooks
├── contexts/            # React context providers
├── types/               # TypeScript type definitions
├── lib/                 # Utilities
└── config/              # Configuration
```

## Key Patterns (Mandatory - See CODE_GUIDELINES.md)

### API Response Format
All API responses follow this consistent structure:

```javascript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: "Error message"
}

// List with pagination
{
  success: true,
  data: [...],
  pagination: { page, limit, total, totalPages }
}
```

### Controllers (Thin)
```javascript
export const sendMessage = async (req, res, next) => {
  try {
    const { error } = validateMessage(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const message = await messageService.sendMessage({
      senderId: req.user.id,
      ...req.body
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);  // Centralized error handler
  }
};
```

### Services (Business Logic)
Services use ES modules and transactions for data consistency:

```javascript
export const sendMessage = async ({ senderId, recipientId, content, encrypted }) => {
  const transaction = await db.sequelize.transaction();
  try {
    const message = await db.Message.create({
      senderId,
      recipientId,
      content,
      encryptedContent: encrypted
    }, { transaction });

    await notificationService.sendMessageNotification(
      recipientId,
      message,
      { transaction }
    );

    await transaction.commit();
    return message;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

### Middleware (Composable)
```javascript
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive user'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
```

## Security Patterns

### Authentication
- **Password Hashing:** bcryptjs (12 rounds)
- **JWT Tokens:** Access (7 days) + Refresh (30 days)
- **Session Management:** Redis-based
- **Rate Limiting:**
  - Login: 5 attempts per 15 min
  - API: 100 requests per 15 min
  - File upload: 10 per hour per user

### Encryption
- **At-rest:** AES-256 for files
- **In-transit:** TLS 1.2+ (Let's Encrypt)
- **E2E Messaging:** libsodium crypto_box (1-to-1 only)
- **Calls:** DTLS-SRTP (WebRTC)

### Input Validation
- **All inputs:** Joi schemas + express-validator on backend
- **SQL Injection:** Parameterized queries (Sequelize ORM)
- **File Uploads:**
  - Type whitelist (MIME type + extension check)
  - Size limit: 10MB (configurable via MAX_FILE_SIZE)
  - ClamAV malware scanning
  - Quarantine infected files

## Real-time Communication

### WebSocket Events (Socket.io)
```javascript
// Client → Server
socket.emit('message.send', { recipientId, content }, callback);
socket.emit('message.typing', { recipientId, isTyping });
socket.emit('call.signal', { callId, signal });

// Server → Client
socket.on('message.new', (message) => { /* ... */ });
socket.on('message.read', ({ messageId }) => { /* ... */ });
socket.on('call.incoming', ({ callId, caller }) => { /* ... */ });
```

### WebRTC Signaling
- **P2P Architecture:** Direct media between clients (server only signals)
- **STUN/TURN:** Coturn server for NAT traversal
- **Fallback:** TURN relay when P2P fails (~10-15% of calls)
- **Encryption:** DTLS-SRTP (server cannot decrypt)

## Performance Requirements

- **Message Delivery:** <500ms (p95)
- **Page Load:** <2 seconds
- **Concurrent Users:** 40 online simultaneously
- **Concurrent Calls:** 10 maximum
- **Video Quality:** 720p minimum (adaptive)
- **System Uptime:** 99.5% (3.5 hours downtime/month allowed)

## Testing

### Test Types
- **Unit Tests:** Jest (services, utilities) - 80% coverage target
- **Integration Tests:** Supertest (API endpoints)
- **E2E Tests:** Playwright/Cypress (critical user flows)
- **Load Tests:** k6/Artillery (40 users, 10 calls)
- **Security Tests:** OWASP ZAP, manual penetration testing

### Test Commands
```bash
# Backend tests (in backend/ directory)
npm test                    # All unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:integration    # Integration tests
npm run test:all            # All tests (unit + integration)

# Manual API testing (in project root)
test-all-api-endpoints-enhanced.bat   # Comprehensive API test suite
api-test-complete-fixed-v2.bat        # Fixed test runner
test-file-upload.ps1                  # File upload tests
node create-test-users.js             # Create test data
```

## Roadmap Compliance

**CRITICAL RULES:**
1. **ALWAYS** follow the plan from `docs/ROADMAP.md`
2. **Before starting work:** Understand which step needs to be completed (check day/task number)
3. **After completing a task:** Edit `docs/ROADMAP.md`, marking completed steps with checkmark `[x]`
4. **At the end of response:** Write **"🔄 Roadmap has been updated"** + list completed steps
5. **Do NOT skip ahead:** Implement only what is explicitly requested in current step

### Roadmap Structure
- **8 weeks, 40 days, 355 tasks** (2-4 hours each)
- **P0 tasks** (blocking): Must complete in order
- **P1 tasks** (high priority): Core features
- **P2/P3 tasks** (medium/low): Can defer if needed
- **Multi-developer support:** 3 parallel streams (Backend Core, Real-time, Frontend)

## Code Quality Rules

### Mandatory
- **DRY Principle:** No code duplication
- **Early Returns:** Prefer guard clauses for readability
- **Descriptive Names:** `handleUserLogin`, `sendEncryptedMessage`
- **TypeScript:** Always use types (if TS project)
- **Accessibility:**
  - ARIA labels on interactive elements
  - Keyboard navigation support (Tab, Enter, Escape)
  - WCAG 2.1 Level AA compliance
- **No TODOs:** Code must be fully implemented (no placeholders)
- **Error Handling:**
  - Try/catch in all async functions
  - Centralized error middleware
  - Never expose stack traces to clients in production

### Production-Ready Standards
Code must be deployable tomorrow. A new team starts the day after. Therefore:
- **Understandable:** Clear variable names, logical structure
- **Simple:** No over-engineering, straightforward solutions
- **Consistent:** Similar features implemented the same way
- **Secure:** No data leaks, proper isolation, validated inputs
- **Tested:** Unit + integration tests for new features

## Environment Variables

### Backend (.env)
See `backend/.env.example` for complete configuration. Key variables:

```bash
NODE_ENV=development|production
PORT=4000                   # Backend port (not 3000!)

# Database
DATABASE_URL=postgresql://messenger:messenger_password@localhost:5432/messenger
DB_HOST=localhost
DB_PORT=5432
DB_NAME=messenger
DB_USER=messenger
DB_PASSWORD=messenger_password

# Redis
REDIS_URL=redis://:messenger_redis_password@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=messenger_redis_password

# JWT
JWT_SECRET=<32+ character secret>
JWT_REFRESH_SECRET=<different secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
SESSION_SECRET=<session secret>

# Files
MAX_FILE_SIZE=10485760     # 10MB
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,...

# ClamAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Email (optional for dev)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_FROM=noreply@messenger.local
AUTO_VERIFY_EMAIL=true     # Dev only - bypass email verification

# CORS
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Features
FEATURE_VIDEO_CALLS=true
FEATURE_FILE_SHARING=true
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

## Deployment

### Development
```bash
# Windows - easiest method
start.bat          # Starts both servers

# Docker - backend + services
cd backend
docker-compose up  # PostgreSQL, Redis, ClamAV, Backend

# URLs
# Backend: http://localhost:4000
# Frontend: http://localhost:3000 (Vite dev server)
# API Docs: http://localhost:4000/api-docs
```

### Production (Single VPS)
- **Server Specs:** 4 vCPU, 8GB RAM, 160GB SSD (~$45/month)
- **Docker Compose:** Backend + DB + Redis + Nginx
- **PM2:** Process management (auto-restart)
- **Nginx:** Reverse proxy, SSL termination, rate limiting
- **Monitoring:** Prometheus + Grafana dashboards
- **Backups:** Daily full (2 AM UTC), hourly incremental, 7-day retention

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed (Let's Encrypt)
- [ ] Rate limiting configured (Nginx + Redis)
- [ ] Monitoring dashboards setup
- [ ] Backup system tested
- [ ] Health check endpoint responding (`/health`)
- [ ] WebSocket authentication working
- [ ] TURN server credentials rotating

## Common Pitfalls to Avoid

**❌ DON'T:**
- Store passwords in plain text or log them
- Trust client input without server-side validation
- Use synchronous operations (fs.readFileSync, etc.)
- Ignore error cases (missing try/catch)
- Return stack traces to clients in production
- Create N+1 query problems (use eager loading)
- Store sensitive data in logs
- Skip transaction rollback on errors
- Block the event loop with heavy computations

**✅ DO:**
- Use parameterized queries (prevent SQL injection)
- Implement centralized error handling
- Use connection pooling (DB, Redis)
- Cache frequently accessed data (Redis)
- Validate all inputs (Joi schemas)
- Use transactions for multi-step operations
- Log important events with structured logging (Winston)
- Implement graceful degradation
- Test error paths, not just happy paths

## Code Quality Standards (Actual Implementation)

**ES Modules (Important!):**
- Backend uses ES modules (`import`/`export`, NOT `require`)
- Use `export` for all functions and constants
- Import statements at the top of files

**Async/Await:**
- All async operations use async/await (no callbacks)
- Always wrap async functions in try/catch
- Use transactions for multi-step database operations

**Naming Conventions:**
- Functions: `camelCase` (e.g., `sendMessage`, `getUserById`)
- Controllers: verb + noun (e.g., `login`, `getUsers`, `updateProfile`)
- Services: descriptive business logic names
- Variables: descriptive, avoid abbreviations

**Error Handling:**
- Controllers: try/catch, call `next(error)` for centralized handling
- Services: throw errors, let middleware handle HTTP responses
- Always rollback transactions on error
- Use Winston logger (not console.log)

**Database:**
- Use Sequelize ORM (parameterized queries prevent SQL injection)
- Always use transactions for multi-step operations
- Eager loading to prevent N+1 queries
- Index frequently queried columns

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 4000 is in use
netstat -ano | findstr :4000

# Kill process if needed (get PID from above)
taskkill /F /PID <pid>

# Verify PostgreSQL is running
docker-compose ps
```

### Database Connection Errors
```bash
# Ensure PostgreSQL container is healthy
cd backend
docker-compose logs postgres

# Verify credentials in .env match docker-compose.yml
# Default: messenger / messenger_password

# Run migrations
npm run migrate
```

### Redis Connection Errors
```bash
# Check Redis container
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli -a messenger_redis_password ping
```

### File Upload Failures
```bash
# Check ClamAV is running (takes time to start)
docker-compose logs clamav

# Verify upload directory exists and is writable
ls -la backend/uploads

# Check file size under MAX_FILE_SIZE (default 10MB)
```

### Frontend Can't Connect to Backend
- Verify backend is running on port 4000
- Check VITE_API_URL in frontend/.env
- Check CORS_ORIGIN in backend/.env includes http://localhost:3000
- Clear browser cache and restart frontend dev server

### Tests Failing
```bash
# Ensure test database is clean
cd backend
npm run migrate:undo
npm run migrate
npm run seed

# Run specific test file
npm test -- tests/unit/services/authService.test.js
```

## Additional Resources

- **Code Patterns:** [docs/CODE_GUIDELINES.md](docs/CODE_GUIDELINES.md) - Mandatory patterns
- **UI Components:** [docs/UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) - Telegram-inspired design
- **Test Cases:** [docs/test-cases/](docs/test-cases/) - 350+ test scenarios
- **API Endpoints:** [docs/brd.md](docs/brd.md) (Section 7) - Complete API list
- **Environment Config:** [backend/.env.example](backend/.env.example) - All environment variables