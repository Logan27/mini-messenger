# Call Model Field Name Fix - Complete

**Date:** October 26, 2025  
**Issue:** Call expiry job failing with "column duration does not exist"  
**Status:** ✅ RESOLVED

## Problem

After fixing the database connection timeout issue, a new error appeared every minute from the call expiry background job:

```
2025-10-26T22:37:01.095Z [error]: Error in call expiry job
{
  "error": "column \"duration\" does not exist",
  "stack": "Error\n    at Query.run (C:\\Users\\anton\\Documents\\messenger\\backend\\node_modules\\sequelize\\lib\\dialects\\postgres\\query.js:50:25)..."
}
```

## Root Cause

**Model-Database schema mismatch** - The Call model defined a field named `duration`, but the actual PostgreSQL table uses `durationSeconds`.

### Database Schema
```sql
durationSeconds | integer | nullable
```

### Model Definition (Incorrect)
```javascript
duration: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
}
```

## Solution

Updated all references from `duration` to `durationSeconds` to match the database schema.

### Files Changed

#### 1. `backend/src/models/Call.js`
```diff
- duration: {
+ durationSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
+   field: 'durationSeconds', // Explicit field mapping
  },
```

#### 2. `backend/src/services/callService.js`
```diff
- call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
+ call.durationSeconds = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);

  logger.info('Call ended', {
    callId,
    userId,
-   duration: call.duration,
+   duration: call.durationSeconds,
    status: call.status,
  });
```

#### 3. `backend/src/config/swagger.js`
```diff
- duration: {
+ durationSeconds: {
    type: 'integer',
    description: 'Call duration in seconds'
  }
```

## Verification

### Before Fix
```
2025-10-26T22:37:01.095Z [error]: Error in call expiry job
{
  "error": "column \"duration\" does not exist"
}
```

### After Fix
✅ Server running without errors for 104+ seconds  
✅ Call expiry job executing every minute successfully  
✅ No database column errors in logs

### Health Check
```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T22:43:15.092Z",
  "uptime": 104.3,
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "status": "healthy",
    "responseTime": "3ms"
  },
  "redis": {
    "status": "healthy",
    "responseTime": "1ms"
  }
}
```

## Related Database Schema

For reference, the complete `calls` table schema:

```sql
Column          | Type                     | Nullable | Default
----------------+--------------------------+----------+--------------------------
id              | uuid                     | not null | uuid_generate_v4()
callerId        | uuid                     | not null |
recipientId     | uuid                     | nullable |
groupId         | uuid                     | nullable |
callType        | call_type                | not null |
status          | call_status              | nullable | 'initiated'::call_status
startedAt       | timestamp with time zone | nullable |
endedAt         | timestamp with time zone | nullable |
durationSeconds | integer                  | nullable |  ← THIS FIELD
createdAt       | timestamp with time zone | nullable | CURRENT_TIMESTAMP
deletedAt       | timestamp with time zone | nullable |
```

## Lessons Learned

1. **Always verify actual database schema** before defining Sequelize models
2. **Use explicit `field` mapping** when column names don't match model property names
3. **Search codebase for all usages** when renaming fields (models, services, controllers, swagger docs)
4. **Monitor background jobs** - they can fail silently without crashing the main application

## Testing Recommendations

Before deploying:
- [ ] Test call initiation
- [ ] Test call duration calculation
- [ ] Test call expiry job (wait 60+ seconds)
- [ ] Verify call history shows correct duration
- [ ] Check admin dashboard call statistics

## Status

✅ **Database connection:** Working (using 127.0.0.1)  
✅ **Redis connection:** Working  
✅ **Backend server:** Running on port 4000  
✅ **Health endpoint:** Responding correctly  
✅ **Call model:** Field names corrected  
✅ **Call expiry job:** Running without errors  
✅ **Background jobs:** All executing successfully
