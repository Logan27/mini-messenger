# Messenger Backend

A secure, scalable real-time messenger backend supporting P2P video calls for up to 100 users. Built with Node.js, Express.js, PostgreSQL, and Redis.

## Features

- **Real-time messaging** with WebSocket support
- **P2P video calling** (server handles signaling only)
- **End-to-end encryption** using libsodium
- **File sharing** with ClamAV malware scanning
- **User authentication** with JWT tokens
- **Rate limiting** with multiple tiers
- **Admin approval** for all user registrations
- **30-day message retention** with auto-deletion
- **Single server deployment** optimized for 4 vCPU, 8GB RAM, 160GB SSD

## Tech Stack

- **Runtime**: Node.js (Latest LTS)
- **Framework**: Express.js v4.x
- **Database**: PostgreSQL v15.x
- **Cache/Session Store**: Redis v7.x
- **Authentication**: JWT with bcrypt
- **Encryption**: libsodium (XOR validation)
- **File Scanning**: ClamAV
- **Documentation**: OpenAPI/Swagger
- **Containerization**: Docker with docker-compose

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database, Redis, JWT configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Authentication, validation, error handling
│   ├── models/         # Sequelize models
│   ├── routes/         # API routes
│   ├── services/       # Business logic services
│   ├── utils/          # Helper functions
│   ├── app.js         # Express application setup
│   └── server.js      # Server startup
├── tests/              # Unit and integration tests
├── docs/              # API documentation
└── docker-compose.yml
```

## Prerequisites

- Docker and Docker Compose
- Node.js (Latest LTS) - for development only
- Git

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd messenger/backend
   ```

2. **Start the services:**
   ```bash
   docker-compose up -d
   ```

3. **Install dependencies (for development):**
   ```bash
   npm install
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://messenger:password@postgres:5432/messenger
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger
DB_USER=messenger
DB_PASSWORD=your_secure_password

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your_session_secret

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin
ADMIN_EMAIL=admin@example.com
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run migrate` - Run database migrations
- `npm run migrate:undo` - Undo last migration
- `npm run seed` - Seed database with test data
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

### Code Quality

- ESLint for code linting
- Prettier for code formatting
- Pre-commit hooks with Husky
- 80%+ test coverage requirement

## API Documentation

API documentation is available at `/api-docs` when the server is running.

Key endpoints:
- `POST /api/auth/register` - User registration (requires admin approval)
- `POST /api/auth/login` - User login
- `GET /api/messages` - Get messages (paginated)
- `POST /api/messages` - Send message
- `POST /api/calls/signaling` - WebRTC signaling for P2P calls

## Deployment

### Production Deployment

1. **Environment Setup:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Build and deploy:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
   ```

### Server Requirements

- **Minimum Specs**: 4 vCPU, 8GB RAM, 160GB SSD
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Network**: Static IP address
- **Security**: Firewall configured, fail2ban installed

## Security Features

- **Authentication**: JWT-based auth with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: End-to-end encryption for messages
- **File Security**: ClamAV scanning for all uploads
- **Rate Limiting**: Multiple rate limit tiers
- **Input Validation**: Joi schema validation with XOR logic
- **CORS**: Configured for cross-origin requests
- **Helmet**: Security headers

## Monitoring

- **Health Checks**: `/health` endpoint
- **Metrics**: Prometheus metrics available at `/metrics`
- **Logging**: Structured logging with correlation IDs
- **Error Tracking**: Centralized error reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team.

---

**Note**: This backend is designed for a maximum of 100 users and uses P2P architecture for video calls. The server handles signaling only, not media streams.