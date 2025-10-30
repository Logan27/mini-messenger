# Database Connection Timeout Fixed

**Date:** October 26, 2025  
**Issue:** Backend crashes on startup with "connection timeout" error  
**Status:** ✅ RESOLVED

## Problem

Backend application failed to start with the following error:
```
💾 Initializing database...
[BACKEND] 2025-10-26T22:26:59.545Z sequelize:connection:pg connection timeout
```

## Root Cause

**Windows Docker networking issue** - On Windows, `localhost` does not properly resolve to Docker containers. The PostgreSQL container was running and healthy, but Node.js couldn't connect using `localhost` as the hostname.

## Solution

Changed database and Redis hostnames from `localhost` to `127.0.0.1` in `.env` file.

### Changes Made

**File:** `backend/.env`

```diff
# Database Connection
- DATABASE_URL=postgresql://messenger:messenger_password@localhost:5432/messenger
+ DATABASE_URL=postgresql://messenger:messenger_password@127.0.0.1:5432/messenger
- DB_HOST=localhost
+ DB_HOST=127.0.0.1

# Redis Connection
- REDIS_URL=redis://:messenger_redis_password@localhost:6379
+ REDIS_URL=redis://:messenger_redis_password@127.0.0.1:6379
- REDIS_HOST=localhost
+ REDIS_HOST=127.0.0.1

# ClamAV Settings
- CLAMAV_HOST=localhost
+ CLAMAV_HOST=127.0.0.1
```

**File:** `backend/src/config/database.js`

1. Added `dialectOptions.connectTimeout` configuration
2. Fixed Sequelize initialization to properly pass config
3. Added detailed connection logging

## Verification

### Direct PostgreSQL Connection Test
Created `test-db-connection.js` to verify connectivity:

```javascript
// ❌ Failed with localhost
const client = new Client({ host: 'localhost', ... });

// ✅ Works with 127.0.0.1
const client = new Client({ host: '127.0.0.1', ... });
```

### Backend Server Status
```bash
# Backend starts successfully
cd backend && npm run dev

# Health check responds
curl http://localhost:4000/health
# Returns: {"status":"ok","timestamp":"2025-10-26T22:36:10.419Z"}
```

## Why This Happens on Windows

Windows Docker Desktop uses a **virtual network bridge** that sometimes doesn't properly map `localhost` to container IPs. Using the loopback address `127.0.0.1` explicitly forces the connection through the correct network interface.

## Future Prevention

For all Docker-related configuration on Windows:
- **Always use `127.0.0.1`** instead of `localhost` for Docker container connections
- Test connectivity with `Test-NetConnection -ComputerName 127.0.0.1 -Port <port>`
- Use `docker exec` to verify services are running inside containers

## Related Issues

There's also a **database schema issue** with the `calls` table missing the `duration` column, but this is unrelated to the connection timeout. The call expiry job fails every minute with:
```
Error in call expiry job: column "duration" does not exist
```

This should be addressed separately with a database migration.

## Commands Reference

```powershell
# Test PostgreSQL connectivity
docker exec messenger-postgres psql -U messenger -d messenger -c "SELECT 1"

# Check Docker containers
docker ps

# Test port accessibility
Test-NetConnection -ComputerName 127.0.0.1 -Port 5432

# Start backend
cd backend
npm run dev

# Health check
curl http://localhost:4000/health
```

## Status Summary

✅ **Database connection:** Fixed (using 127.0.0.1)  
✅ **Redis connection:** Fixed (using 127.0.0.1)  
✅ **Backend server:** Running on port 4000  
✅ **Health endpoint:** Responding correctly  
⚠️  **Call expiry job:** Failing due to missing database column (separate issue)
