# Environment Configuration Guide

## Quick Start

### Local Development (Default)
```bash
# Uses .env.development settings (localhost URLs)
docker-compose up -d
```

### Production Deployment
```bash
# 1. Copy production environment
cp .env.production .env

# 2. Edit .env with your actual production secrets
nano .env

# 3. Run with production overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Environment Files

| File | Purpose | Git Tracked? |
|------|---------|--------------|
| `.env` | Active environment (loaded by Docker/Vite) | ❌ No |
| `.env.development` | Local development defaults | ❌ No |
| `.env.production` | Production template | ❌ No |
| `.env.example` | Template for developers | ✅ Yes |

### Frontend-specific (in `/frontend`)

| File | Purpose | Loaded When |
|------|---------|-------------|
| `.env` | Default values | Always |
| `.env.development` | Dev URLs (localhost) | `npm run dev` |
| `.env.production` | Prod URLs | `npm run build` |
| `.env.local` | Local overrides (highest priority) | Always |

---

## How It Works

### Vite Environment Variable Priority (highest to lowest):
1. `.env.local` - Local overrides (never committed)
2. `.env.[mode].local` - Mode-specific local overrides
3. `.env.[mode]` - Mode-specific (e.g., `.env.production`)
4. `.env` - Default values

### Docker Compose Environment Priority:
1. Shell environment variables
2. `.env` file in project root
3. `environment:` section in docker-compose.yml
4. Default values in docker-compose.yml (`${VAR:-default}`)

---

## Switching Environments

### Option 1: Use symbolic links (recommended)
```bash
# For development
cp .env.development .env

# For production
cp .env.production .env
```

### Option 2: Use docker-compose overrides
```bash
# Development (default)
docker-compose up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Important Variables

### Backend
- `CORS_ORIGIN` - Frontend URL for CORS
- `FRONTEND_URL` - Used for password reset emails, etc.
- `JWT_SECRET` - **CHANGE IN PRODUCTION** (min 32 chars)
- `DB_PASSWORD` - **CHANGE IN PRODUCTION**

### Frontend
- `VITE_API_URL` - Backend API endpoint
- `VITE_SOCKET_URL` - WebSocket endpoint

---

## Security Notes

⚠️ **Never commit actual secrets to git!**

1. All `.env*` files (except `.env.example`) are gitignored
2. Use strong, random secrets in production (64+ characters)
3. Rotate secrets regularly
4. Use environment-specific Firebase credentials if possible
