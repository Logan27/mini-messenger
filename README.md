# Messenger with Video Calls

A lightweight, secure messenger application for small teams (up to 100 users) featuring real-time text messaging and 1-to-1 video/voice calling. Fully containerized for single-command deployment.

![License](https://img.shields.io/badge/license-Proprietary-red)
![Docker](https://img.shields.io/badge/docker-required-blue)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue)
![React](https://img.shields.io/badge/react-18-blue)

## ✨ Features

### Core Functionality
- 💬 **Real-time Messaging** - Instant 1-to-1 and group chats (up to 20 participants)
- 📹 **Video Calling** - 1-to-1 video/voice calls with P2P WebRTC (720p minimum)
- 📁 **File Sharing** - Share images, documents, videos up to 10MB with malware scanning
- 🔔 **Notifications** - Push, email, and in-app notifications
- 🔒 **End-to-End Encryption** - E2E encryption infrastructure for private messages and calls
- ✓ **Read Receipts** - Message delivery and read status
- ⌨️ **Typing Indicators** - Real-time typing status
- 🟢 **Online Status** - See who's online, offline, or away

### Admin Features
- ✅ **User Approval** - Admin approval required for new registrations
- 👥 **User Management** - Activate/deactivate accounts
- 📊 **System Statistics** - Monitor active users, storage, performance
- 🔍 **Audit Logs** - Track system activities
- ⚙️ **System Configuration** - Configure retention, file limits, features

### Security & Privacy
- 🔐 **JWT Authentication** - Access tokens (7 days) + refresh tokens (30 days)
- 🛡️ **Rate Limiting** - Protection against brute force and abuse
- 🔒 **CSRF Protection** - Cross-site request forgery prevention
- 🦠 **Malware Scanning** - ClamAV integration for file uploads
- 📜 **30-Day Retention** - Automatic message cleanup
- 🔑 **2FA Support** - Optional two-factor authentication

## 🚀 Quick Start

### Prerequisites

**Required:**
- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Git

**That's it!** No Node.js, PostgreSQL, Redis, or other dependencies needed locally.

### 3-Step Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd messenger
```

#### 2. Configure Environment
```bash
# Copy example configuration
cp .env.example .env

# Edit .env and set secure secrets (required for production!)
# For development testing, default values work fine
```

**Important:** Before production use, generate secure random secrets:
```bash
# Example secure values (minimum 32 characters each):
JWT_SECRET=your-random-secret-here-min-32-chars
JWT_REFRESH_SECRET=different-random-secret-min-32-chars
SESSION_SECRET=another-random-secret-min-32-chars
CSRF_SECRET=yet-another-random-secret-32-chars
```

#### 3. Launch Everything
```bash
# Windows
docker-start.bat

# Linux/Mac
./docker-start.sh

# Or manually
docker-compose up -d
```

That's it! The application is now running.

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application interface |
| **Backend API** | http://localhost:4000 | REST API |
| **API Documentation** | http://localhost:4000/api-docs | Swagger UI |
| **Health Check** | http://localhost:4000/health | Backend health status |

### Optional: Development Tools

Start database and cache management interfaces:
```bash
docker-compose --profile dev up -d
```

| Tool | URL | Credentials |
|------|-----|-------------|
| **pgAdmin** | http://localhost:8080 | admin@messenger.local / admin_password |
| **Redis Commander** | http://localhost:8081 | (no auth) |

## 🛠️ Daily Commands

### Viewing Logs
```bash
docker-compose logs -f              # All services
docker-compose logs -f backend      # Backend only
docker-compose logs -f frontend     # Frontend only
docker-compose logs --tail=50       # Last 50 lines
```

### Restarting Services
```bash
docker-compose restart backend      # Restart backend
docker-compose restart frontend     # Restart frontend
docker-compose restart              # Restart all
```

### Stopping Everything
```bash
# Windows
docker-stop.bat

# Linux/Mac
./docker-stop.sh

# Or manually
docker-compose down
```

### Rebuilding After Code Changes
```bash
docker-compose up -d --build        # Rebuild and restart all
docker-compose up -d --build backend # Rebuild backend only
```

### Running Database Migrations
```bash
docker-compose exec backend npm run migrate        # Run migrations
docker-compose exec backend npm run migrate:undo   # Rollback
docker-compose exec backend npm run seed           # Seed test data
```

### Running Tests
```bash
# Backend tests
docker-compose exec backend npm test                    # All unit tests
docker-compose exec backend npm run test:integration   # Integration tests
docker-compose exec backend npm run test:coverage      # Coverage report

# Run specific test file
docker-compose exec backend npm test -- tests/unit/services/authService.test.js
```

### Database Access
```bash
# PostgreSQL CLI
docker-compose exec postgres psql -U messenger -d messenger

# Redis CLI
docker-compose exec redis redis-cli -a messenger_redis_password

# Execute SQL file
docker-compose exec -T postgres psql -U messenger -d messenger < backup.sql
```

### Container Management
```bash
docker-compose ps                   # View running containers
docker-compose top                  # View container processes
docker stats                        # Resource usage
docker-compose exec backend sh      # Shell access to backend
```

## 📁 Project Structure

```
messenger/
├── backend/                # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/        # Request handlers (thin layer)
│   │   ├── services/           # Business logic
│   │   ├── models/             # Sequelize ORM models
│   │   ├── routes/             # API routes
│   │   ├── middleware/         # Auth, CSRF, rate limiting
│   │   ├── validators/         # Joi schemas
│   │   ├── jobs/               # Background jobs (Bull)
│   │   ├── migrations/         # Database migrations
│   │   └── utils/              # Helpers, logger
│   ├── tests/                  # Jest tests
│   └── Dockerfile
├── frontend/               # React/TypeScript frontend
│   ├── src/
│   │   ├── components/         # UI components (shadcn/ui)
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API clients (axios)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── contexts/           # React Context providers
│   │   └── types/              # TypeScript types
│   ├── tests/                  # Vitest + Playwright tests
│   ├── docker/
│   │   └── nginx.conf          # Nginx config for production
│   └── Dockerfile
├── mobile/                 # React Native/Expo (separate)
│   └── src/                    # Mobile app source
├── docs/                   # Documentation
│   ├── brd.md                  # Business requirements
│   ├── arch.md                 # Architecture
│   ├── api-spec.md             # API specification
│   └── CODE_GUIDELINES.md      # Code patterns
├── docker-compose.yml      # 🚀 Main orchestration file
├── .env.example            # Configuration template
├── docker-start.bat/sh     # Launch scripts
└── README.md               # This file
```

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js 20 (Alpine Linux)
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **ORM:** Sequelize 6 (ES modules)
- **Real-time:** Socket.io (WebSocket), WebRTC
- **Authentication:** JWT (custom implementation)
- **Encryption:** bcryptjs (passwords), libsodium (E2E)
- **Validation:** Joi + express-validator
- **Background Jobs:** Bull (Redis queue) + node-cron
- **File Handling:** multer + sharp + ClamAV
- **Logging:** Winston + Morgan
- **Security:** helmet, hpp, express-rate-limit, csrf-csrf

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI:** shadcn/ui (Radix UI + Tailwind CSS)
- **State:** React Context + TanStack Query (React Query)
- **API Client:** Axios + Socket.io-client
- **Forms:** React Hook Form + Zod validation
- **Testing:** Vitest + Playwright
- **Production Server:** Nginx (Alpine)

### Mobile
- **Framework:** React Native 0.81 + Expo ~54
- **Navigation:** React Navigation 7
- **State:** TanStack Query + AsyncStorage
- **Push:** Firebase Cloud Messaging
- **Testing:** Jest

### Infrastructure
- **Containers:** Docker + Docker Compose
- **Reverse Proxy:** Nginx (production)
- **SSL:** Let's Encrypt (production)
- **Process Manager:** PM2 (production)
- **Monitoring:** Prometheus + Grafana (optional)

## 🔧 Configuration

All configuration is in the root `.env` file. Copy from `.env.example`:

### Essential Settings (Minimum Required)

```bash
# Security secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=your-secret-key-change-in-production-32-chars-min
JWT_REFRESH_SECRET=your-refresh-secret-32-chars-min
SESSION_SECRET=your-session-secret-32-chars-min
CSRF_SECRET=your-csrf-secret-32-chars-min

# Environment
NODE_ENV=development                # development or production
BUILD_TARGET=production             # production or development (Docker)

# Ports (change if needed)
BACKEND_PORT=4000
FRONTEND_PORT=3000

# Database (defaults work for Docker)
DB_NAME=messenger
DB_USER=messenger
DB_PASSWORD=messenger_password

# Redis (defaults work for Docker)
REDIS_PASSWORD=messenger_redis_password
```

### Full Configuration

See [.env.example](.env.example) for all available options including:
- Email/SMTP settings
- Firebase push notifications
- File upload limits
- Feature flags
- Monitoring configuration

## 🏗️ Development Modes

### Production Mode (Default)

Optimized builds with Nginx serving frontend:
```bash
BUILD_TARGET=production docker-compose up -d
```

Features:
- Multi-stage Docker builds (smaller images)
- Nginx serving static files (frontend)
- No source code mounting
- Production optimizations

### Development Mode

Hot reload for faster iteration:
```bash
BUILD_TARGET=development docker-compose up -d
```

Features:
- Source code mounted as volumes
- Hot reload on file changes
- Vite dev server (frontend)
- Nodemon auto-restart (backend)

## 📊 Performance & Scale

### Capacity Targets

- **Max Users:** 100 registered users
- **Concurrent Users:** 40 online simultaneously
- **Concurrent Calls:** 10 maximum (1-to-1 only)
- **Message Delivery:** <500ms (p95)
- **Page Load:** <2 seconds
- **Video Quality:** 720p minimum (adaptive)
- **System Uptime:** 99.5%

### Server Requirements

**Recommended (100 users):**
- CPU: 4 vCPUs
- RAM: 8 GB
- Storage: 160 GB SSD
- Network: 1 Gbps
- **Cost:** ~$45-60/month (VPS)

**Minimum (50 users):**
- CPU: 2 vCPUs
- RAM: 4 GB
- Storage: 80 GB SSD
- **Cost:** ~$20-30/month (VPS)

## 🔒 Security Features

### Authentication & Authorization
- bcryptjs password hashing (12 rounds)
- JWT access + refresh tokens
- Redis-based session management
- Admin approval for new users
- Optional 2FA support

### Network Security
- TLS 1.2+ encryption (Let's Encrypt)
- CSRF protection on state-changing operations
- Rate limiting (login, API, file uploads)
- Helmet security headers
- HPP (HTTP Parameter Pollution) protection

### Data Protection
- E2E encryption infrastructure (libsodium)
- AES-256 file encryption at rest
- DTLS-SRTP for WebRTC calls
- SQL injection prevention (Sequelize ORM)
- XSS protection (input sanitization)

### File Security
- MIME type validation
- File size limits (10MB default)
- ClamAV malware scanning
- Quarantine for infected files
- Automatic virus definition updates

## 🧪 Testing

### Running Tests in Docker

```bash
# Backend unit tests
docker-compose exec backend npm test

# Backend integration tests
docker-compose exec backend npm run test:integration

# All backend tests
docker-compose exec backend npm run test:all

# Coverage report
docker-compose exec backend npm run test:coverage
```

### Test Coverage Targets

- **Backend:** 80% minimum
- **Frontend:** 70% minimum
- **E2E:** Critical user flows

### Test Types

- **Unit Tests:** Jest (backend), Vitest (frontend)
- **Integration Tests:** Supertest (API endpoints)
- **E2E Tests:** Playwright (user workflows)
- **Load Tests:** k6/Artillery (optional)

## 🚨 Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker-compose logs

# Check specific service
docker-compose logs backend
docker-compose logs postgres

# Verify configuration
cat .env

# Restart services
docker-compose restart
```

### Port Conflicts

```bash
# Check what's using ports
netstat -ano | findstr :4000        # Windows
lsof -i :4000                       # Linux/Mac

# Change ports in .env
BACKEND_PORT=4001
FRONTEND_PORT=3001

# Restart
docker-compose down
docker-compose up -d
```

### Database Connection Failed

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Run migrations
docker-compose exec backend npm run migrate
```

### ClamAV Slow to Start

ClamAV downloads virus definitions (~200MB) on first start:
```bash
# Monitor progress
docker-compose logs -f clamav

# Wait for: "clamd is ready"
# First start: 5-10 minutes
# Subsequent starts: ~30 seconds
```

### Frontend Can't Reach Backend

```bash
# Verify backend is running
curl http://localhost:4000/health

# Check CORS configuration in .env
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Check frontend environment
docker-compose logs frontend
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Remove unused volumes
docker volume prune

# Remove specific volumes (DELETES DATA!)
docker-compose down -v
```

## 💾 Backup & Restore

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U messenger messenger > backup_$(date +%Y%m%d).sql

# Compressed backup
docker-compose exec postgres pg_dump -U messenger messenger | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Database Restore

```bash
# From backup file
docker-compose exec -T postgres psql -U messenger messenger < backup.sql

# From compressed backup
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U messenger messenger
```

### Volume Backup

```bash
# Backup all data volumes
docker run --rm -v messenger_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /data .

docker run --rm -v messenger_redis_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/redis_data_$(date +%Y%m%d).tar.gz -C /data .
```

## 🚀 Deployment

### Production Deployment

1. **Prepare server** (Ubuntu 22.04 LTS recommended)
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com | sh

   # Install Docker Compose
   sudo apt install docker-compose-plugin
   ```

2. **Clone repository**
   ```bash
   git clone <repository-url>
   cd messenger
   ```

3. **Configure production environment**
   ```bash
   cp .env.example .env

   # Edit .env:
   # - Set NODE_ENV=production
   # - Generate secure random secrets (32+ chars each)
   # - Configure SMTP for emails
   # - Set proper CORS_ORIGIN
   ```

4. **Generate secrets**
   ```bash
   # Example: generate 32-byte random secrets
   openssl rand -base64 32
   ```

5. **Start with production profile**
   ```bash
   docker-compose --profile production up -d
   ```

6. **Run migrations**
   ```bash
   docker-compose exec backend npm run migrate
   ```

7. **Setup SSL** (recommended: Let's Encrypt)
   ```bash
   # Install certbot
   sudo apt install certbot

   # Get certificate
   sudo certbot certonly --standalone -d yourdomain.com
   ```

8. **Monitor logs**
   ```bash
   docker-compose logs -f
   ```

### Production Checklist

- [ ] Secure secrets generated (32+ chars, random)
- [ ] SSL certificates installed
- [ ] Firewall configured (ports 80, 443, 4000, 3000)
- [ ] Database backups scheduled (daily)
- [ ] Monitoring configured
- [ ] Email/SMTP working
- [ ] Health checks responding
- [ ] Resource limits set
- [ ] Log rotation configured

## 📖 Documentation

- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Comprehensive Docker guide
- **[CLAUDE.md](CLAUDE.md)** - Development guide for Claude Code
- **[docs/brd.md](docs/brd.md)** - Business requirements
- **[docs/frd.md](docs/frd.md)** - Functional requirements
- **[docs/arch.md](docs/arch.md)** - System architecture
- **[docs/api-spec.md](docs/api-spec.md)** - API specification
- **[docs/CODE_GUIDELINES.md](docs/CODE_GUIDELINES.md)** - Code patterns (mandatory)
- **[docs/UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md)** - Design system
- **[docs/test-cases/](docs/test-cases/)** - Test scenarios

## 🤝 Contributing

1. Follow patterns in [docs/CODE_GUIDELINES.md](docs/CODE_GUIDELINES.md)
2. Use ES modules (`import`/`export`) in backend - **NOT** `require`
3. Write tests for new features (80% coverage target)
4. Use TypeScript types in frontend/mobile
5. Run linters: `docker-compose exec backend npm run lint:fix`

## ⚠️ Project Constraints

- Maximum **100 registered users**
- **1-to-1 calls only** (no group video calls)
- **Single server deployment** (not distributed)
- **30-day message retention** (automatic cleanup)
- **10MB file size limit** (configurable)

## 📄 License

Proprietary - All rights reserved

## 🙋 Support

- **Documentation:** See [docs/](docs/) directory
- **API Docs:** http://localhost:4000/api-docs (when running)
- **Docker Guide:** [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **Health Check:** http://localhost:4000/health

---

**Built with Node.js, React, PostgreSQL, Redis, WebRTC, and Docker** 🐳
