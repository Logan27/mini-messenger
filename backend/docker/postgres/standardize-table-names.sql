-- ===========================================================================
-- STANDARDIZE TABLE NAMES TO CAMELCASE
-- ===========================================================================
-- This migration renames all snake_case tables to camelCase for consistency
-- with the existing camelCase tables (users, groups, groupMembers, etc.)
--
-- NOTE: This requires updating Sequelize model tableName properties!
-- ===========================================================================

-- 1. Rename notification_settings → notificationSettings
ALTER TABLE IF EXISTS notification_settings RENAME TO "notificationSettings";

-- 2. Rename password_history → passwordHistory
ALTER TABLE IF EXISTS password_history RENAME TO "passwordHistory";

-- 3. Rename system_settings → systemSettings
ALTER TABLE IF EXISTS system_settings RENAME TO "systemSettings";

-- 4. Rename group_message_status → groupMessageStatus
ALTER TABLE IF EXISTS group_message_status RENAME TO "groupMessageStatus";

-- 5. Rename audit_logs → auditLogs
ALTER TABLE IF EXISTS audit_logs RENAME TO "auditLogs";

-- 6. Rename file_uploads → fileUploads (for ClamAV virus scanning)
ALTER TABLE IF EXISTS file_uploads RENAME TO "fileUploads";

-- Verify all table names are now camelCase
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Expected result:
-- announcements
-- auditLogs (was audit_logs)
-- calls
-- contacts
-- devices
-- fileUploads (was file_uploads)
-- files
-- groupMembers
-- groupMessageStatus (was group_message_status)
-- groups
-- messages
-- notificationSettings (was notification_settings)
-- notifications
-- passwordHistory (was password_history)
-- reports
-- sessions
-- systemSettings (was system_settings)
-- users
