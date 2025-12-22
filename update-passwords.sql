-- Update password hash for admin and anton users
-- Password: Admin123!@#
UPDATE users SET password_hash = '$2a$12$dx58X5MN3kuHnTpQQXp3muoDKRjo4mZEXAscyXZr9OWVr/FawVxG2' WHERE email IN ('admin@test.com', 'anton@test.com');

-- Verify the update
SELECT username, email, role, approval_status, email_verified FROM users WHERE username IN ('admin', 'anton');
