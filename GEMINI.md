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
- Runtime: Node.js 18 LTS / Express.js
- Database: PostgreSQL 14 (primary) + Redis 7 (cache/sessions/queue)
- Real-time: Socket.io (WebSocket), WebRTC (P2P video/audio with STUN/TURN)
- Authentication: Passport.js + JWT (access 24h, refresh 7d)
- Encryption: bcrypt (passwords), libsodium (E2E messages), crypto (at-rest)
- Validation: Joi / express-validator
- Background Jobs: Bull (Redis-based queue) + node-cron
- File Handling: multer + sharp (thumbnails) + ClamAV (malware scanning)
- Notifications: SendGrid/AWS SES (email) + Firebase Cloud Messaging (push)

**Frontend:**
- Web: React or Vue.js + Zustand/Redux + shadcn/ui (Radix UI + Tailwind CSS)
- Mobile: React Native (Android 10+) + React Native Paper (Material Design 3)
- API Client: Axios with interceptors
- Real-time: Socket.io-client + WebRTC (simple-peer)

**Infrastructure:**
- OS: Ubuntu 22.04 LTS
- Containers: Docker + Docker Compose
- Proxy: Nginx (reverse proxy, SSL termination, rate limiting)
- SSL: Let's Encrypt (certbot)
- Process Manager: PM2
- Monitoring: Prometheus + Grafana
- Logging: Winston + Morgan

### Key Commands

**Docker (Primary):**
```bash
# Development
docker-compose up              # Start all services
docker-compose up -d           # Start in background
docker-compose ps              # Check services
docker-compose logs            # View logs
docker-compose logs -f backend # Follow backend logs
docker-compose down            # Stop all services

# Execute commands in containers
docker-compose exec backend npm test
docker-compose exec backend npm run migrate
docker-compose exec db psql -U messenger_user -d messenger
```

**Backend (Local Development - Windows):**
```bash
# Setup
npm install
node -v  # Should be 18+

# Run
npm run dev          # Development with nodemon
npm start            # Production

# Database
npm run migrate      # Run migrations
npm run migrate:undo # Rollback migration
npm run seed         # Seed test data

# Testing
npm test                           # All tests
npm test -- --grep "Authentication" # Specific test suite
npm run test:coverage              # With coverage report

# Linting & Formatting
npm run lint         # ESLint
npm run lint:fix     # Auto-fix
npm run format       # Prettier

# API Documentation
npm run docs         # Generate Swagger/OpenAPI docs
```

**Frontend:**
```bash
# Web (React)
cd frontend
npm install
npm run dev          # Development server (Vite)
npm run build        # Production build
npm run preview      # Preview production build

# Mobile (React Native)
cd mobile
npm install
npm run android      # Run on Android emulator/device
npm run ios          # Run on iOS simulator/device
npm run build:android # Build APK
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

### Backend Structure
```
backend/
├── src/
│   ├── config/          # DB, Redis, env configuration
│   ├── controllers/     # Thin request handlers (call services)
│   ├── services/        # Business logic (transactions, complex operations)
│   ├── middleware/      # Auth, rate limiting, error handling
│   ├── models/          # Sequelize/Prisma models
│   ├── routes/          # Express routes
│   ├── validators/      # Joi validation schemas
│   ├── socket/          # Socket.io event handlers
│   ├── jobs/            # Background jobs (Bull + cron)
│   └── utils/           # Helpers (encryption, logger, cache)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── app.js
```

### Frontend Structure (FSD - Feature-Sliced Design)
```
frontend/src/
├── app/                 # App-level config, providers
├── pages/               # Route pages (Login, Chat, Settings)
├── widgets/             # Complex UI blocks (ChatList, MessageInput)
├── features/            # User actions (SendMessage, InitiateCall)
├── entities/            # Business entities (User, Message, Call)
├── shared/              # Reusable UI components, API client, utils
│   ├── ui/              # shadcn/ui components
│   ├── api/             # Axios client with interceptors
│   ├── lib/             # Utilities
│   └── config/
└── index.tsx
```

## Key Patterns (Mandatory - See CODE_GUIDELINES.md)

### Controllers (Thin)
```javascript
const sendMessage = async (req, res, next) => {
  try {
    const { error } = validateMessage(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const message = await messageService.sendMessage({
      senderId: req.user.id,
      ...req.body
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);  // Centralized error handler
  }
};
```

### Services (Business Logic)
```javascript
const sendMessage = async ({ senderId, recipientId, content, encrypted }) => {
  const transaction = await db.sequelize.transaction();
  try {
    const message = await db.Message.create({ /*...*/ }, { transaction });
    await notificationService.sendMessageNotification(recipientId, message, { transaction });
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
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError('No token provided');

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findByPk(decoded.userId);

  if (!req.user || req.user.status !== 'active') {
    throw new UnauthorizedError('Invalid or inactive user');
  }
  next();
};
```

## Security Patterns

### Authentication
- **Password Hashing:** bcrypt (12 rounds)
- **JWT Tokens:** Access (24h) + Refresh (7d)
- **Session Management:** Redis-based, 30min timeout
- **Rate Limiting:**
  - Login: 5 attempts per IP per 15 min
  - API: 100 requests per user per min
  - File upload: 10 per hour per user
- **2FA:** Optional TOTP (speakeasy)

### Encryption
- **At-rest:** AES-256 for files
- **In-transit:** TLS 1.2+ (Let's Encrypt)
- **E2E Messaging:** libsodium crypto_box (1-to-1 only)
- **Calls:** DTLS-SRTP (WebRTC)

### Input Validation
- **All inputs:** Joi schemas on backend
- **SQL Injection:** Parameterized queries (Sequelize/Prisma)
- **XSS Protection:** DOMPurify, validator.js
- **File Uploads:**
  - Type whitelist (MIME type + extension check)
  - Size limit (25MB)
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
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e            # E2E tests
npm run test:load           # Load testing
npm run test:coverage       # Coverage report
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
```bash
NODE_ENV=development|production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/messenger
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
ENCRYPTION_KEY=<generated>

# Services
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=<sendgrid_api_key>
FCM_SERVER_KEY=<fcm_key>

# Files
MAX_FILE_SIZE=25000000
UPLOADS_DIR=/var/www/messenger/uploads

# STUN/TURN
TURN_SERVER_URL=turn:yourdomain.com:3478
TURN_USERNAME=<generated>
TURN_CREDENTIAL=<generated>
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
REACT_APP_TURN_SERVER=turn:yourdomain.com:3478
```

## Deployment

### Development
```bash
docker-compose up  # Starts PostgreSQL, Redis, Backend, Frontend
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
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

## Additional Resources

- **Code Patterns:** See [docs/CODE_GUIDELINES.md](docs/CODE_GUIDELINES.md) for detailed examples
- **UI Components:** See [docs/UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) for design system
- **Test Cases:** See [docs/test-cases/](docs/test-cases/) for 350+ scenarios
- **API Endpoints:** See [docs/brd.md](docs/brd.md) (Section 7) for complete list