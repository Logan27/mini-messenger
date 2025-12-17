# Docker Setup Guide

Complete guide for running the Messenger application with Docker.

## 🎯 Overview

The application now runs **100% in Docker** with zero local dependencies (except Docker itself). Everything is containerized:

- ✅ Backend (Node.js/Express)
- ✅ Frontend (React/Vite served by Nginx)
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ ClamAV malware scanner
- ✅ Optional dev tools (pgAdmin, Redis Commander)

## 🚀 Quick Start

### 1. One-Command Launch

```bash
# Windows
docker-start.bat

# Linux/Mac
./docker-start.sh

# Or manually
docker-compose up -d
```

### 2. Access Everything

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **API Docs:** http://localhost:4000/api-docs
- **Health Check:** http://localhost:4000/health

### 3. View Logs

```bash
docker-compose logs -f              # All services
docker-compose logs -f backend      # Backend only
docker-compose logs -f frontend     # Frontend only
```

### 4. Stop Everything

```bash
# Windows
docker-stop.bat

# Linux/Mac
./docker-stop.sh

# Or manually
docker-compose down
```

## 📦 What's Included

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| **frontend** | 3000 | React app served by Nginx |
| **backend** | 4000 | Node.js/Express API |
| **postgres** | 5432 | PostgreSQL 15 database |
| **redis** | 6379 | Redis 7 cache/sessions |
| **clamav** | 3310 | ClamAV malware scanner |

### Development Tools (Optional)

| Service | Port | Description |
|---------|------|-------------|
| **pgadmin** | 8080 | PostgreSQL admin interface |
| **redis-commander** | 8081 | Redis GUI client |

Start dev tools with:
```bash
docker-compose --profile dev up -d
```

## 🔧 Configuration

### Environment Setup

1. Copy example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update these secrets (minimum):
   ```bash
   JWT_SECRET=your-secret-key-32-chars-min
   JWT_REFRESH_SECRET=your-refresh-secret-32-chars
   SESSION_SECRET=your-session-secret-32-chars
   CSRF_SECRET=your-csrf-secret-32-chars
   ```

3. For development, defaults work fine. For production, **MUST** use secure random strings.

### Port Configuration

Change ports in `.env`:
```bash
BACKEND_PORT=4000
FRONTEND_PORT=3000
```

## 🛠️ Common Tasks

### View Service Status

```bash
docker-compose ps
```

### Restart a Service

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

### Run Database Migrations

```bash
docker-compose exec backend npm run migrate
```

### Seed Test Data

```bash
docker-compose exec backend npm run seed
```

### Run Tests

```bash
docker-compose exec backend npm test
docker-compose exec backend npm run test:integration
```

### Access Database

```bash
# PostgreSQL CLI
docker-compose exec postgres psql -U messenger -d messenger

# Redis CLI
docker-compose exec redis redis-cli -a messenger_redis_password
```

### Clean Up Everything

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (deletes all data!)
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

## 🏗️ Development vs Production

### Development Mode

Enables hot reload for faster development:

```bash
BUILD_TARGET=development docker-compose up -d
```

Features:
- Source code mounted as volumes
- Hot reload on file changes
- Vite dev server (frontend)
- Nodemon (backend)
- Dev tools included

### Production Mode

Optimized for deployment:

```bash
BUILD_TARGET=production docker-compose up -d
```

Features:
- Multi-stage builds (smaller images)
- Nginx serving static files (frontend)
- PM2 process manager (backend)
- No source code mounting
- Security hardening

## 🔍 Debugging

### View Container Logs

```bash
# All logs
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend sh

# Database shell
docker-compose exec postgres psql -U messenger -d messenger

# Redis shell
docker-compose exec redis redis-cli -a messenger_redis_password
```

### Check Health Status

```bash
# Container health
docker-compose ps

# Backend health endpoint
curl http://localhost:4000/health

# Frontend health
curl http://localhost:3000/health
```

### Inspect Container

```bash
docker inspect messenger-backend
docker inspect messenger-frontend
docker inspect messenger-postgres
```

## 📊 Resource Management

### View Resource Usage

```bash
docker stats
```

### Recommended Resources

For 100 users:
- **CPU:** 4 vCPUs
- **RAM:** 8 GB
- **Disk:** 160 GB SSD
- **Network:** 1 Gbps

Minimal setup:
- **CPU:** 2 vCPUs
- **RAM:** 4 GB
- **Disk:** 80 GB SSD

### Optimize Resource Usage

Edit `docker-compose.yml` and add resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 🔒 Security

### Network Isolation

All services communicate on isolated `messenger-network`:

```yaml
networks:
  messenger-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Container Security

- Non-root users in containers
- Read-only file systems where possible
- Security hardening with Alpine Linux base
- Secrets managed via environment variables

### Production Recommendations

1. **Use external secrets management** (HashiCorp Vault, AWS Secrets Manager)
2. **Enable Docker Content Trust**
3. **Regular security scans:** `docker scan messenger-backend`
4. **Keep base images updated**
5. **Use reverse proxy with SSL** (Nginx with Let's Encrypt)

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :4000  # Windows
lsof -i :4000                 # Linux/Mac

# Change port in .env
BACKEND_PORT=4001
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Rebuild container
docker-compose up -d --build backend

# Remove and recreate
docker-compose rm -f backend
docker-compose up -d backend
```

### Database Connection Failed

```bash
# Check database is healthy
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Run migrations
docker-compose exec backend npm run migrate
```

### ClamAV Takes Forever to Start

ClamAV needs to download virus definitions (~200MB) on first start:

```bash
# Check progress
docker-compose logs -f clamav

# Wait for: "clamd is ready"
```

First start: 5-10 minutes. Subsequent starts: 30 seconds.

### Out of Disk Space

```bash
# Clean up unused images
docker system prune

# Remove all unused volumes
docker volume prune

# See disk usage
docker system df
```

## 📝 Backup & Restore

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U messenger messenger > backup.sql

# With timestamp
docker-compose exec postgres pg_dump -U messenger messenger > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
# From backup file
docker-compose exec -T postgres psql -U messenger messenger < backup.sql
```

### Backup Volumes

```bash
# Backup postgres data
docker run --rm -v messenger_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Backup redis data
docker run --rm -v messenger_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .
```

## 🔄 Updates

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend npm run migrate
```

### Update Base Images

```bash
# Pull latest images
docker-compose pull

# Recreate containers
docker-compose up -d
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)

## 🆘 Getting Help

1. Check logs: `docker-compose logs -f`
2. Check health: `docker-compose ps`
3. Restart service: `docker-compose restart <service>`
4. Full reset: `docker-compose down -v && docker-compose up -d`

---

**For non-Docker setup, see [README.md](README.md) "Local Development" section.**
