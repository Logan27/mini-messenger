# Database Schema vs Sequelize Models - Comprehensive Verification Report

**Generated**: December 7, 2025
**Database**: PostgreSQL (messenger database)
**Total Tables**: 18

## Summary

### ✅ **Fully Aligned** (11 tables)
- messages
- file_uploads
- calls
- users
- groups
- contacts
- notifications
- group_members
- password_history
- user_sessions
- audit_log

### ⚠️ **Needs Attention** (7 tables)
- devices
- device_tokens
- notification_settings
- reports
- announcements
- system_settings
- group_message_status

---

## Detailed Analysis

### ✅ **messages** table
**Status**: FULLY ALIGNED
**Columns**: 26
**Model**: Message.js (underscored: false, paranoid: false)
**Notes**: All encryption, reaction, metadata columns present after migration

### ✅ **file_uploads** table
**Status**: FULLY ALIGNED
**Columns**: 21
**Model**: File.js (underscored: true, tableName: 'file_uploads')
**Notes**: Fixed tableName from 'files' to 'file_uploads', added underscored: true

### ✅ **calls** table
**Status**: FULLY ALIGNED
**Columns**: 12
**Model**: Call.js (underscored: true)
**Notes**: Added deleted_at and updated_at columns via migration

### ✅ **users** table
**Status**: FULLY ALIGNED
**Columns**: 34
**Model**: User.js (underscored: true, paranoid: true)
**Notes**: Added underscored: true to model configuration

### ✅ **groups** table
**Status**: FULLY ALIGNED
**Columns**: 14 (after migration)
**Model**: Group.js (underscored: true, paranoid: false)
**Notes**:
- Renamed avatar_url → avatar
- Renamed created_by → creator_id
- Added: max_members, group_type, last_message_at, settings, encryption_key, deleted_at

### ✅ **contacts** table
**Status**: FULLY ALIGNED
**Columns**: 13 (after migration)
**Model**: Contact.js (underscored: true, paranoid: true)
**Notes**:
- Renamed contact_id → contact_user_id
- Added: blocked_at, nickname, notes, is_favorite, is_muted, last_contact_at

### ✅ **notifications** table
**Status**: FULLY ALIGNED
**Columns**: 14 (after migration)
**Model**: Notification.js (underscored: true, paranoid: true)
**Notes**:
- Renamed message → content
- Renamed is_read → read
- Added: priority, category, updated_at, deleted_at

### ✅ **group_members** table
**Status**: FULLY ALIGNED
**Columns**: 14 (after migration)
**Model**: GroupMember.js (underscored: true, paranoid: true)
**Notes**: Added 9 columns: left_at, is_active, invited_by, permissions, last_seen_at, is_muted, created_at, updated_at, deleted_at

### ✅ **password_history** table
**Status**: FULLY ALIGNED
**Columns**: 4
**Model**: PasswordHistory.js (underscored: true, timestamps: false)
**Notes**: Simple table, no issues

### ✅ **user_sessions** table
**Status**: FULLY ALIGNED
**Columns**: 7
**Model**: Session.js (underscored: true, timestamps: false)
**Notes**: Model completely rewritten to match database

### ✅ **audit_log** table
**Status**: FULLY ALIGNED
**Columns**: 10
**Model**: AuditLog.js (underscored: true, timestamps: false)
**Notes**: No issues

---

## ⚠️ Tables Needing Attention

### **devices** table
**Database columns** (9):
- id, user_id, device_type, device_name, device_token, is_active, last_seen_at, created_at, updated_at

**Model** (Device.js) has only (3):
- id, userId, token

**Issues**:
1. Model missing: deviceType, deviceName, isActive, lastSeenAt
2. Model has `token` but database has `device_token`
3. Model missing createdAt, updatedAt timestamp fields
4. **Action needed**: Expand Device.js model to match database OR remove unused database columns

---

### **device_tokens** table
**Database columns** (9):
- id, user_id, token, device_type, device_info (JSONB), is_active, created_at, updated_at, expires_at

**Model** (DeviceToken.js) has (11):
- id, userId, token, deviceType, deviceName, userAgent, isActive, lastUsedAt, createdAt, updatedAt

**Issues**:
1. **Missing `underscored: true`** in model configuration
2. Database has `device_info` (JSONB), model has separate deviceName + userAgent
3. Database has `expires_at`, model has `lastUsedAt`
4. **Action needed**: Add `underscored: true` to model, align field structure

---

### **notification_settings** table
**Database columns** (13):
- id, user_id, message_notifications, group_notifications, call_notifications, email_notifications, push_notifications, sound_enabled, vibration_enabled, show_preview, muted_until, created_at, updated_at

**Model** (NotificationSettings.js) has (18):
- id, userId, inAppEnabled, emailEnabled, pushEnabled, quietHoursStart, quietHoursEnd, doNotDisturb, messageNotifications, callNotifications, mentionNotifications, adminNotifications, systemNotifications, createdAt, updatedAt

**Issues**:
1. Database has: group_notifications, sound_enabled, vibration_enabled, show_preview, muted_until
2. Model has: inAppEnabled, quietHoursStart/End, doNotDisturb, mentionNotifications, adminNotifications
3. Different naming: email_notifications vs emailEnabled, push_notifications vs pushEnabled
4. **Action needed**: Decide on canonical schema - either update database to match model OR update model to match database

---

### **reports** table
**Database columns** (12):
- id, reporter_id, reported_user_id, reported_message_id, report_type, reason, status, admin_notes, resolved_by, resolved_at, created_at, updated_at

**Model**: Need to check if Report.js matches (haven't read yet)
**Action needed**: Verify Report.js model

---

### **announcements** table
**Database columns** (10):
- id, title, content, author_id, priority, is_active, starts_at, expires_at, created_at, updated_at

**Model**: Need to check if Announcement.js matches (haven't read yet)
**Action needed**: Verify Announcement.js model

---

### **system_settings** table
**Database columns** (8):
- id, setting_key, setting_value, data_type, description, is_public, created_at, updated_at

**Model**: Need to find SystemSettings.js
**Action needed**: Verify model exists and matches

---

### **group_message_status** table
**Database columns** (8):
- id, message_id, user_id, is_read, read_at, is_delivered, delivered_at, created_at

**Model**: Need to find GroupMessageStatus.js
**Action needed**: Verify model exists and matches

---

## Migration Files Applied

1. `add-missing-columns.sql` - Added columns to messages, file_uploads tables
2. `fix-remaining-schema-mismatches.sql` - Fixed groups, contacts, notifications, group_members tables

## Recommendations

### Immediate Actions:
1. **Fix DeviceToken.js** - Add `underscored: true` to model configuration
2. **Verify Device.js** - Expand model to include all database fields OR remove unused columns from database
3. **Align NotificationSettings** - Decide canonical schema and apply migration

### Long-term:
1. Create a comprehensive database migration file documenting all schema changes
2. Add automated tests to verify model-database alignment
3. Implement schema versioning and migration tracking
4. Document any intentional model-database mismatches with reasons

## Verification Commands

```bash
# Check all table schemas
for table in messages file_uploads calls users groups contacts notifications group_members devices device_tokens notification_settings; do
  echo "=== $table ==="
  docker exec -i messenger-postgres psql -U messenger -d messenger << EOF
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = '$table' ORDER BY ordinal_position;
EOF
done

# Count columns per table
docker exec -i messenger-postgres psql -U messenger -d messenger << 'EOF'
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
EOF
```

## Notes

- All models should have `underscored: true` when database uses snake_case columns
- Paranoid mode (`paranoid: true`) enables soft deletes with `deleted_at` column
- Timestamps (`timestamps: true`) adds `created_at` and `updated_at` columns
- Sequelize automatically converts camelCase field names to snake_case when `underscored: true`
