UPDATE users SET "lockedUntil" = NULL, "failedLoginAttempts" = 0 WHERE username = 'admin';
SELECT username, "failedLoginAttempts", "lockedUntil" FROM users WHERE username = 'admin';
