-- Check existing contacts
SELECT 
    c.id,
    u1.username as requester,
    u2.username as recipient,
    c.status,
    c."createdAt"
FROM contacts c
JOIN users u1 ON c."userId" = u1.id
JOIN users u2 ON c."contactUserId" = u2.id
ORDER BY c."createdAt" DESC;

-- Check if reverse relationships exist for accepted contacts
SELECT 
    c1.id as original_id,
    u1.username as user1,
    u2.username as user2,
    c1.status as original_status,
    c2.id as reverse_id,
    c2.status as reverse_status
FROM contacts c1
JOIN users u1 ON c1."userId" = u1.id
JOIN users u2 ON c1."contactUserId" = u2.id
LEFT JOIN contacts c2 ON c2."userId" = c1."contactUserId" AND c2."contactUserId" = c1."userId"
WHERE c1.status = 'accepted';

-- Create missing reverse relationships for accepted contacts
INSERT INTO contacts ("id", "userId", "contactUserId", "status", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    c."contactUserId",
    c."userId",
    'accepted',
    NOW(),
    NOW()
FROM contacts c
WHERE c.status = 'accepted'
AND NOT EXISTS (
    SELECT 1 FROM contacts c2 
    WHERE c2."userId" = c."contactUserId" 
    AND c2."contactUserId" = c."userId"
);

-- Show final result
SELECT 
    u1.username as user1,
    u2.username as user2,
    c.status
FROM contacts c
JOIN users u1 ON c."userId" = u1.id
JOIN users u2 ON c."contactUserId" = u2.id
ORDER BY u1.username, u2.username;
