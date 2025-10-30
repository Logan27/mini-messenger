-- =====================================
-- Migrate all tables from snake_case to camelCase
-- =====================================

-- USERS TABLE
ALTER TABLE users RENAME COLUMN password_hash TO "passwordHash";
ALTER TABLE users RENAME COLUMN first_name TO "firstName";
ALTER TABLE users RENAME COLUMN last_name TO "lastName";
ALTER TABLE users RENAME COLUMN last_login_at TO "lastLoginAt";
ALTER TABLE users RENAME COLUMN created_at TO "createdAt";
ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE users RENAME COLUMN approval_status TO "approvalStatus";
ALTER TABLE users RENAME COLUMN approved_by TO "approvedBy";
ALTER TABLE users RENAME COLUMN approved_at TO "approvedAt";
ALTER TABLE users RENAME COLUMN rejection_reason TO "rejectionReason";
ALTER TABLE users RENAME COLUMN email_verified TO "emailVerified";
ALTER TABLE users RENAME COLUMN email_verification_token TO "emailVerificationToken";
ALTER TABLE users RENAME COLUMN password_reset_token TO "passwordResetToken";
ALTER TABLE users RENAME COLUMN password_reset_expires TO "passwordResetExpires";
ALTER TABLE users RENAME COLUMN failed_login_attempts TO "failedLoginAttempts";
ALTER TABLE users RENAME COLUMN locked_until TO "lockedUntil";
ALTER TABLE users RENAME COLUMN public_key TO "publicKey";
ALTER TABLE users RENAME COLUMN deleted_at TO "deletedAt";
ALTER TABLE users RENAME COLUMN is_active TO "isActive";
ALTER TABLE users RENAME COLUMN is_verified TO "isVerified";

-- USER_SESSIONS TABLE
ALTER TABLE user_sessions RENAME COLUMN user_id TO "userId";
ALTER TABLE user_sessions RENAME COLUMN refresh_token TO "refreshToken";
ALTER TABLE user_sessions RENAME COLUMN device_info TO "deviceInfo";
ALTER TABLE user_sessions RENAME COLUMN ip_address TO "ipAddress";
ALTER TABLE user_sessions RENAME COLUMN expires_at TO "expiresAt";
ALTER TABLE user_sessions RENAME COLUMN created_at TO "createdAt";

-- MESSAGES TABLE
ALTER TABLE messages RENAME COLUMN sender_id TO "senderId";
ALTER TABLE messages RENAME COLUMN recipient_id TO "recipientId";
ALTER TABLE messages RENAME COLUMN group_id TO "groupId";
ALTER TABLE messages RENAME COLUMN message_type TO "messageType";
ALTER TABLE messages RENAME COLUMN file_url TO "fileUrl";
ALTER TABLE messages RENAME COLUMN file_name TO "fileName";
ALTER TABLE messages RENAME COLUMN file_size TO "fileSize";
ALTER TABLE messages RENAME COLUMN mime_type TO "mimeType";
ALTER TABLE messages RENAME COLUMN encryption_key TO "encryptionKey";
ALTER TABLE messages RENAME COLUMN is_deleted TO "isDeleted";
ALTER TABLE messages RENAME COLUMN edited_at TO "editedAt";
ALTER TABLE messages RENAME COLUMN created_at TO "createdAt";
ALTER TABLE messages RENAME COLUMN expires_at TO "expiresAt";

-- GROUPS TABLE
ALTER TABLE groups RENAME COLUMN avatar_url TO "avatarUrl";
ALTER TABLE groups RENAME COLUMN created_by TO "createdBy";
ALTER TABLE groups RENAME COLUMN is_active TO "isActive";
ALTER TABLE groups RENAME COLUMN created_at TO "createdAt";
ALTER TABLE groups RENAME COLUMN updated_at TO "updatedAt";

-- GROUP_MEMBERS TABLE
ALTER TABLE group_members RENAME COLUMN group_id TO "groupId";
ALTER TABLE group_members RENAME COLUMN user_id TO "userId";
ALTER TABLE group_members RENAME COLUMN joined_at TO "joinedAt";

-- CALLS TABLE
ALTER TABLE calls RENAME COLUMN caller_id TO "callerId";
ALTER TABLE calls RENAME COLUMN recipient_id TO "recipientId";
ALTER TABLE calls RENAME COLUMN group_id TO "groupId";
ALTER TABLE calls RENAME COLUMN call_type TO "callType";
ALTER TABLE calls RENAME COLUMN started_at TO "startedAt";
ALTER TABLE calls RENAME COLUMN ended_at TO "endedAt";
ALTER TABLE calls RENAME COLUMN duration_seconds TO "durationSeconds";
ALTER TABLE calls RENAME COLUMN created_at TO "createdAt";

-- FILE_UPLOADS TABLE
ALTER TABLE file_uploads RENAME COLUMN user_id TO "userId";
ALTER TABLE file_uploads RENAME COLUMN message_id TO "messageId";
ALTER TABLE file_uploads RENAME COLUMN file_name TO "fileName";
ALTER TABLE file_uploads RENAME COLUMN original_name TO "originalName";
ALTER TABLE file_uploads RENAME COLUMN file_path TO "filePath";
ALTER TABLE file_uploads RENAME COLUMN file_size TO "fileSize";
ALTER TABLE file_uploads RENAME COLUMN mime_type TO "mimeType";
ALTER TABLE file_uploads RENAME COLUMN thumbnail_path TO "thumbnailPath";
ALTER TABLE file_uploads RENAME COLUMN scan_status TO "scanStatus";
ALTER TABLE file_uploads RENAME COLUMN scan_result TO "scanResult";
ALTER TABLE file_uploads RENAME COLUMN uploaded_at TO "uploadedAt";

-- AUDIT_LOG TABLE
ALTER TABLE audit_log RENAME COLUMN user_id TO "userId";
ALTER TABLE audit_log RENAME COLUMN ip_address TO "ipAddress";
ALTER TABLE audit_log RENAME COLUMN user_agent TO "userAgent";
ALTER TABLE audit_log RENAME COLUMN created_at TO "createdAt";

-- Update check constraints and triggers that reference old column names
-- (Note: PostgreSQL constraint and trigger definitions remain unchanged as they use column references)

COMMIT;
