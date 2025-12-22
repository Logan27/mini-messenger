-- Insert admin and anton test users
-- Password for both: Admin123!@#

INSERT INTO users (
    id, username, email, password_hash, first_name, last_name, 
    role, status, approval_status, email_verified, created_at, updated_at
) VALUES 
    (gen_random_uuid(), 'admin', 'admin@test.com', 
     '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC', 
     'Admin', 'User', 'admin', 'offline', 'approved', true, NOW(), NOW()),
    (gen_random_uuid(), 'anton', 'anton@test.com', 
     '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC', 
     'Anton', 'User', 'user', 'offline', 'approved', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET 
    password_hash = '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC',
    approval_status = 'approved',
    email_verified = true;

-- Show created users
SELECT username, email, role, approval_status, email_verified FROM users WHERE username IN ('admin', 'anton');
