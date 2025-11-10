-- Create admin user
INSERT INTO users (
  id,
  username, 
  email,
  "passwordHash",
  "firstName",
  "lastName",
  role,
  "emailVerified",
  "approvalStatus",
  "createdAt",
  "updatedAt"
) 
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@messenger.local',
  '$2a$10$F6ZDSsrqeMN0PoBddTNS0uHUQ7lr/pD/.UGYS5uawkwRx8B0jpxyO',
  'Admin',
  'User',
  'admin',
  true,
  'approved',
  NOW(),
  NOW()
) 
ON CONFLICT DO NOTHING;









