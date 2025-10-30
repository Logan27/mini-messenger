# User Seed Data - Setup Complete

**Date**: October 25, 2025  
**Status**: ✅ ALL USERS CREATED

---

## 🎉 Summary

Successfully created **1 admin user** and **5 test users** with:
- ✅ Approved status (no manual approval needed)
- ✅ Verified emails
- ✅ Pre-configured contacts (mutual friendships)
- ✅ Identical password for easy testing

---

## 👑 Admin User

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Email** | `admin@messenger.local` |
| **Password** | `Admin123!@#` |
| **Role** | admin |
| **Name** | System Administrator |
| **Status** | Approved & Email Verified |

### Admin Capabilities

- ✅ Access `/api/admin/*` endpoints
- ✅ Approve/reject user registrations
- ✅ View system statistics
- ✅ Access audit logs
- ✅ Manage announcements
- ✅ Export reports (CSV/PDF)
- ✅ Deactivate/reactivate users

---

## 👥 Test Users

All test users have the **same password**: `Admin123!@#`

| Username | Email | Full Name | Role | Status |
|----------|-------|-----------|------|--------|
| `alice` | alice@test.com | Alice Anderson | user | ✅ Approved |
| `bob` | bob@test.com | Bob Brown | user | ✅ Approved |
| `charlie` | charlie@test.com | Charlie Chen | user | ✅ Approved |
| `diana` | diana@test.com | Diana Davis | user | ✅ Approved |
| `eve` | eve@test.com | Eve Evans | user | ✅ Approved |

---

## 🤝 Pre-configured Contacts

All test users are mutual friends with each other (10 contact pairs):

```
alice ←→ bob
alice ←→ charlie  
alice ←→ diana
alice ←→ eve
bob ←→ charlie
bob ←→ diana
bob ←→ eve
charlie ←→ diana
charlie ←→ eve
diana ←→ eve
```

**Status**: All contacts are `accepted` (no pending requests)

---

## 🧪 Quick Test Scenarios

### 1. Admin Login & Dashboard

```bash
# Login as admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin123!@#"}'

# Get system stats (requires admin token)
curl -X GET http://localhost:4000/api/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**PowerShell:**
```powershell
$body = @{ identifier = 'admin'; password = 'Admin123!@#' } | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
$adminToken = $response.data.tokens.accessToken

# Get stats
$headers = @{ 'Authorization' = "Bearer $adminToken" }
Invoke-RestMethod -Uri 'http://localhost:4000/api/admin/stats' -Headers $headers
```

### 2. Test User Chat Scenario

```bash
# Login as Alice
ALICE_TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"Admin123!@#"}' | jq -r '.data.tokens.accessToken')

# Get Alice's contacts (should see Bob, Charlie, Diana, Eve)
curl -X GET http://localhost:4000/api/contacts \
  -H "Authorization: Bearer $ALICE_TOKEN"

# Get conversations
curl -X GET http://localhost:4000/api/messages/conversations \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

### 3. Send Message Between Test Users

```bash
# Login as Bob
BOB_TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"bob","password":"Admin123!@#"}' | jq -r '.data.tokens.accessToken')

# Get Alice's user ID
ALICE_ID=$(curl -X GET "http://localhost:4000/api/users/search?q=alice" \
  -H "Authorization: Bearer $BOB_TOKEN" | jq -r '.data[0].id')

# Send message from Bob to Alice
curl -X POST http://localhost:4000/api/messages \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$ALICE_ID\",\"content\":\"Hello Alice!\"}"
```

### 4. Create Group Chat

```bash
# Login as Charlie
CHARLIE_TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"charlie","password":"Admin123!@#"}' | jq -r '.data.tokens.accessToken')

# Get Diana and Eve's IDs
DIANA_ID=$(curl -X GET "http://localhost:4000/api/users/search?q=diana" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" | jq -r '.data[0].id')
  
EVE_ID=$(curl -X GET "http://localhost:4000/api/users/search?q=eve" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" | jq -r '.data[0].id')

# Create group
curl -X POST http://localhost:4000/api/groups \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Group\",\"description\":\"Testing group chat\",\"memberIds\":[\"$DIANA_ID\",\"$EVE_ID\"]}"
```

---

## 🔑 Login Credentials Summary

**All users** can login with:
- **Identifier**: username OR email
- **Password**: `Admin123!@#`

### Admin
```
Username: admin
Email: admin@messenger.local
Password: Admin123!@#
```

### Test Users
```
alice / alice@test.com / Admin123!@#
bob / bob@test.com / Admin123!@#
charlie / charlie@test.com / Admin123!@#
diana / diana@test.com / Admin123!@#
eve / eve@test.com / Admin123!@#
```

---

## 📝 Database Verification

### Check Created Users
```sql
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
```

### Check Contacts
```sql
SELECT COUNT(*) as total_contacts FROM contacts;

-- Should return 13 (10 from seed + 3 existing)
```

### Check User Statistics
```sql
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE "approvalStatus" = 'approved') as approved_users,
    COUNT(*) FILTER (WHERE "approvalStatus" = 'pending') as pending_users,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_users
FROM users;
```

---

## 🔧 Files Created

### 1. `backend/docker/postgres/seed-users.sql`
- SQL script with INSERT statements
- Creates users with UUID generation
- Sets up contact relationships

### 2. `backend/seed-users.js`
- Node.js script using bcrypt for password hashing
- Generates proper password hashes
- Updates existing users if they exist
- Displays created users in formatted output

---

## 🚀 Usage in Development

### Initial Setup
```bash
cd backend
node seed-users.js
```

### Reset Test Users
To reset all test users to default password:
```bash
node seed-users.js
```

### Add More Test Users
Edit `seed-users.js` and add to the `testUsers` array:
```javascript
const testUsers = [
  // ... existing users
  { username: 'frank', email: 'frank@test.com' },
];
```

---

## 🎯 Use Cases

### 1. API Testing
Use these users to test:
- Authentication flows
- Message sending/receiving
- Contact management
- Group chat functionality
- User search
- Notification system

### 2. Frontend Development
- Multiple test accounts for chat UI
- Pre-configured contacts (no need to add manually)
- Admin panel testing
- User approval workflow testing

### 3. WebSocket Testing
- Real-time messaging between test users
- Typing indicators
- Online/offline status
- Message delivery status

### 4. Permission Testing
- Admin vs regular user capabilities
- Group permissions (owner, admin, member)
- Contact request handling

---

## ⚠️ Security Notes

### Development Only

These credentials are **for development/testing only**:
- ❌ DO NOT use in production
- ❌ DO NOT commit seed scripts with real passwords
- ❌ DO NOT use weak passwords in production

### Production Setup

For production:
1. Remove all test users
2. Create admin with strong password
3. Use environment variables for admin credentials
4. Implement password reset for first login
5. Enable 2FA for admin accounts

---

## 📊 Current Database State

After running the seed script:

```
Total Users: 31 (6 seeded + 25 existing)
├── Admin Users: 1 (admin)
├── Approved Users: 6 (admin + 5 test users)
└── Pending Users: 25 (existing test users)

Total Contacts: 13
├── Test User Contacts: 10 (all mutual friendships)
└── Existing Contacts: 3

Total Messages: 5 (existing)
Total Groups: 3 (existing)
```

---

## 🔄 Resetting Data

### Reset Test Users Only
```bash
cd backend
node seed-users.js
```

### Reset Entire Database
```bash
cd backend
docker-compose down -v
docker-compose up -d
# Wait for DB to initialize
node seed-users.js
```

---

## ✅ Verification Checklist

- [x] Admin user created with role='admin'
- [x] Admin can login with username/email
- [x] 5 test users created and approved
- [x] All test users can login
- [x] 10 contact relationships created
- [x] All users have emailVerified=true
- [x] Admin endpoints accessible
- [x] User endpoints work for test users
- [x] Contacts appear in each user's contact list

---

## 🎓 Learning Resources

### Test User Purposes

| User | Purpose |
|------|---------|
| **admin** | Testing admin panel, user approval, system management |
| **alice** | Primary test user for messaging scenarios |
| **bob** | Secondary test user for 1-to-1 chat testing |
| **charlie** | Group chat scenarios, multi-user interactions |
| **diana** | Contact management, user search testing |
| **eve** | Additional user for complex scenarios |

---

## 📞 Support

If you encounter issues:

1. **Login fails**: Verify password is exactly `Admin123!@#` (case-sensitive)
2. **Contacts not showing**: Run seed script again to recreate contacts
3. **Admin access denied**: Check user role in database
4. **Database errors**: Try resetting database and rerunning seed script

---

**Setup Complete!** 🎉

You can now:
- Login as `admin` / `Admin123!@#`
- Test with 5 pre-configured users
- Use existing contact relationships
- Start messaging immediately

**Next Steps**: Try logging in as different users and testing the chat functionality!
