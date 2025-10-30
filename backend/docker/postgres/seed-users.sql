-- ===========================================================================
-- SEED USERS FOR MESSENGER APPLICATION
-- ===========================================================================
-- Creates admin user and test users with proper credentials
-- Password for all users: Admin123!@# (bcrypt hash with 12 rounds)
-- ===========================================================================

-- Generate password hash for: Admin123!@#
-- bcrypt hash: $2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC

-- 1. Create admin user
INSERT INTO users (
    id,
    username, 
    email, 
    "passwordHash",
    "firstName", 
    "lastName", 
    role, 
    status,
    "approvalStatus",
    "emailVerified",
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@messenger.local',
    '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC',
    'System',
    'Administrator',
    'admin',
    'offline',
    'approved',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    "approvalStatus" = 'approved',
    "emailVerified" = true,
    "passwordHash" = '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC';

-- 2. Create test users (all with same password: Admin123!@#)
INSERT INTO users (
    id,
    username, 
    email, 
    "passwordHash",
    "firstName", 
    "lastName", 
    role,
    status,
    "approvalStatus",
    "emailVerified",
    "createdAt",
    "updatedAt"
)
VALUES
    -- Test User 1
    (
        gen_random_uuid(),
        'alice',
        'alice@test.com',
        '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC',
        'Alice',
        'Anderson',
        'user',
        'offline',
        'approved',
        true,
        NOW(),
        NOW()
    ),
    -- Test User 2
    (
        gen_random_uuid(),
        'bob',
        'bob@test.com',
        '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC',
        'Bob',
        'Brown',
        'user',
        'offline',
        'approved',
        true,
        NOW(),
        NOW()
    ),
    -- Test User 3
    (
        gen_random_uuid(),
        'charlie',
        'charlie@test.com',
        '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC',
        'Charlie',
        'Chen',
        'user',
        'offline',
        'approved',
        true,
        NOW(),
        NOW()
    ),
    -- Test User 4
    (
        gen_random_uuid(),
        'diana',
        'diana@test.com',
        '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC',
        'Diana',
        'Davis',
        'user',
        'offline',
        'approved',
        true,
        NOW(),
        NOW()
    ),
    -- Test User 5
    (
        gen_random_uuid(),
        'eve',
        'eve@test.com',
        '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC',
        'Eve',
        'Evans',
        'user',
        'offline',
        'approved',
        true,
        NOW(),
        NOW()
    )
ON CONFLICT (email) DO UPDATE SET
    "approvalStatus" = 'approved',
    "emailVerified" = true,
    "passwordHash" = '$2a$12$8K1p/a0dL2DQVS0JrEPqFu8YhO5xJbECL0qKBZWc0H4.HLKrIvGTC';

-- 3. Create contacts between test users (mutual friendships)
WITH user_ids AS (
    SELECT id, username FROM users WHERE username IN ('alice', 'bob', 'charlie', 'diana', 'eve')
)
INSERT INTO contacts (
    id,
    "userId",
    "contactUserId",
    status,
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid(),
    u1.id,
    u2.id,
    'accepted',
    NOW(),
    NOW()
FROM user_ids u1
CROSS JOIN user_ids u2
WHERE u1.username < u2.username  -- Avoid duplicates and self-contacts
ON CONFLICT DO NOTHING;

-- Display created users
SELECT 
    username,
    email,
    "firstName",
    "lastName",
    role,
    "approvalStatus",
    "emailVerified"
FROM users 
WHERE email IN (
    'admin@messenger.local',
    'alice@test.com',
    'bob@test.com',
    'charlie@test.com',
    'diana@test.com',
    'eve@test.com'
)
ORDER BY role DESC, username;

-- Display contact relationships
SELECT 
    u1.username as user,
    u2.username as contact,
    c.status
FROM contacts c
JOIN users u1 ON c."userId" = u1.id
JOIN users u2 ON c."contactUserId" = u2.id
WHERE u1.username IN ('alice', 'bob', 'charlie', 'diana', 'eve')
ORDER BY u1.username, u2.username;
