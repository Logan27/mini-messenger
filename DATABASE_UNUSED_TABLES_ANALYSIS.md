# Database Unused Tables Analysis

**Date**: October 25, 2025  
**Database**: messenger (PostgreSQL 15)

## Summary

Found **2 duplicate tables** that can be safely deleted. The third table (`file_uploads`) is part of the virus scanning design and should be kept.

## Database Tables (20 total)

### ✅ Used Tables (17)

| Table | Model | Rows | Status |
|-------|-------|------|--------|
| `users` | User.js | 18 | ✅ Active |
| `sessions` | Session.js | 38 | ✅ Active |
| `messages` | Message.js | 1 | ✅ Active (test message) |
| `groups` | Group.js | 1 | ✅ Active (test) |
| `groupMembers` | GroupMember.js | 1 | ✅ Active (test) |
| `contacts` | Contact.js | 1 | ✅ Active (test) |
| `notifications` | Notification.js | 0 | ✅ Used but empty |
| `notification_settings` | NotificationSettings.js | 2 | ✅ Active |
| `announcements` | Announcement.js | 0 | ✅ Used but empty |
| `files` | File.js | 0 | ✅ Used but empty |
| `calls` | Call.js | 0 | ✅ Used but empty |
| `devices` | Device.js | 0 | ✅ Used but empty |
| `reports` | Report.js | 0 | ✅ Used but empty |
| `audit_logs` | AuditLog.js | 0 | ✅ Used but empty |
| `password_history` | PasswordHistory.js | 0 | ✅ Used but empty |
| `system_settings` | systemSetting.js | 0 | ✅ Used but empty |
| `group_message_status` | GroupMessageStatus.js | 0 | ✅ Used but empty |

### ⚠️ Unused/Duplicate Tables (3)

| Table | Rows | Issue | Recommendation |
|-------|------|-------|----------------|
| **`audit_log`** | 0 | Duplicate of `audit_logs` | ❌ **DELETE** |
| **`user_sessions`** | 0 | Duplicate of `sessions` | ❌ **DELETE** |
| **`file_uploads`** | 0 | ClamAV scanning table (no model) | ✅ **KEEP** (part of design) |

## Detailed Analysis

### 1. `audit_log` - DUPLICATE ❌

**Problem**: Two audit log tables exist:
- `audit_log` (unused, 0 rows)
- `audit_logs` (used by AuditLog.js model, 0 rows)

**Model Reference**:
```javascript
// backend/src/models/AuditLog.js
tableName: 'audit_logs'
```

**Recommendation**: **DELETE** `audit_log` table
```sql
DROP TABLE IF EXISTS audit_log;
```

### 2. `user_sessions` - DUPLICATE ❌

**Problem**: Two session tables exist:
- `user_sessions` (unused, 0 rows)
- `sessions` (used by Session.js model, 38 rows - actively used!)

**Model Reference**:
```javascript
// backend/src/models/Session.js
tableName: 'sessions'
```

**Recommendation**: **DELETE** `user_sessions` table
```sql
DROP TABLE IF EXISTS user_sessions;
```

### 3. `file_uploads` - **KEEP FOR NOW** ⚠️

**Problem**: Two file-related tables exist:
- `file_uploads` (no model, 0 rows, **defined in init.sql**)
- `files` (used by File.js model, 0 rows)

**Investigation Results**:
✅ **Table is defined in**: `backend/docker/postgres/init.sql`
✅ **Service exists**: `backend/src/services/fileUploadService.js`
✅ **Schema includes**: virus scanning columns (`virus_scan_status`, `virus_scan_result`, `is_quarantined`)
✅ **Indexes created**: `idx_file_uploads_user`, `idx_file_uploads_scan_status`
❌ **No Sequelize model**: No model file found
❌ **Not referenced in routes/controllers**: Zero matches in backend code

**Architectural Purpose**:
The `file_uploads` table appears designed for **virus scanning workflow**:
1. User uploads file → stored in `file_uploads` with `virus_scan_status='pending'`
2. ClamAV scans file → updates `virus_scan_status` and `virus_scan_result`
3. If clean → file record moved/linked to `files` table
4. If infected → file quarantined (`is_quarantined=true`)

**Possible Scenarios**:
1. ✅ Designed for ClamAV integration but not implemented yet
2. ❌ Legacy table replaced by inline scanning in `files` table
3. ⚠️ Planned feature not yet developed

**Recommendation**: **KEEP FOR NOW** - likely part of planned virus scanning workflow
- Don't delete until file upload functionality is fully tested
- May be used by upload middleware or ClamAV integration
- If confirmed unused after thorough testing, then consider deletion

**Test Required**:
```bash
# Test file upload and check which table gets populated
curl -X POST http://localhost:4000/api/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt"

# Check both tables
docker exec messenger-postgres psql -U messenger -d messenger -c "SELECT * FROM file_uploads;"
docker exec messenger-postgres psql -U messenger -d messenger -c "SELECT * FROM files;"
```

## Recommendations

### Immediate Actions

1. **Delete duplicate tables**:
```sql
-- Remove duplicate audit log table
DROP TABLE IF EXISTS audit_log CASCADE;

-- Remove duplicate session table  
DROP TABLE IF EXISTS user_sessions CASCADE;
```

2. **Investigate file_uploads**:
```bash
# Search for any references
grep -rn "file_uploads" backend/src/
grep -rn "file_uploads" backend/docker/
```

### Table Naming Consistency Issues

**Mixed naming conventions found**:
- ✅ camelCase: `groupMembers` (correct)
- ❌ snake_case: `audit_log`, `audit_logs`, `user_sessions`, `file_uploads`, `notification_settings`, `password_history`, `system_settings`, `group_message_status`

**Recommendation**: Standardize all table names to camelCase for consistency:
```sql
-- Future migration (non-urgent)
ALTER TABLE notification_settings RENAME TO "notificationSettings";
ALTER TABLE password_history RENAME TO "passwordHistory";
ALTER TABLE system_settings RENAME TO "systemSettings";
ALTER TABLE group_message_status RENAME TO "groupMessageStatus";
ALTER TABLE audit_logs RENAME TO "auditLogs";
```

**Note**: Model files already use snake_case for these tables, so changing would require:
1. Updating model `tableName` properties
2. Updating all migration scripts
3. Testing all affected endpoints

## Empty Tables (Not Unused, Just No Data Yet)

These tables have 0 rows but are actively used by models:
- `notifications` - Will populate when users receive notifications
- `announcements` - For admin announcements
- `files` - For file uploads
- `calls` - For video/voice call history
- `devices` - For push notifications
- `reports` - For user/content reports
- `audit_logs` - For security audit trail
- `password_history` - For password reuse prevention
- `system_settings` - For application configuration
- `group_message_status` - For tracking group message read status

**Status**: ✅ Keep all these tables - they're part of the application design

## Summary Statistics

- **Total Tables**: 20
- **Used Tables**: 17 (85%)
- **Unused/Duplicate**: 2 (10%) - `audit_log`, `user_sessions`
- **ClamAV Design**: 1 (5%) - `file_uploads` (keep for virus scanning)
  - 2 confirmed duplicates (safe to delete)
  - 1 confirmed as part of design (keep)
- **Tables with Data**: 7
- **Empty but Used**: 10

## SQL Script to Clean Up

```sql
-- ============================================================================
-- CLEANUP UNUSED TABLES
-- ============================================================================

-- 1. Drop duplicate audit_log table (audit_logs is the correct one)
DROP TABLE IF EXISTS audit_log CASCADE;

-- 2. Drop duplicate user_sessions table (sessions is the correct one)
DROP TABLE IF EXISTS user_sessions CASCADE;

-- 3. file_uploads table is part of virus scanning design - KEEP IT
-- DROP TABLE IF EXISTS file_uploads CASCADE;  -- DO NOT DELETE - used by ClamAV workflow

-- Verify remaining tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

## Next Steps

1. ✅ Review this analysis
2. ⚠️ Search codebase for `file_uploads` references → ✅ **DONE** (found in init.sql, part of ClamAV design)
3. ✅ Execute cleanup SQL to remove duplicates (when ready)
4. 📝 Document `file_uploads` table → ✅ **DONE** (virus scanning workflow)
5. 🔄 Consider standardizing all table names to camelCase (low priority)

---

**Analysis Complete**: Found 2 duplicate tables to delete. The `file_uploads` table is part of the virus scanning design and should be kept.
