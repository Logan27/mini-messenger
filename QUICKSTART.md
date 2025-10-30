# Messenger - Quick Start Guide

Complete messenger application with real-time communication.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

## Installation

### 1. Database Setup

```bash
# Start PostgreSQL
# Create database
createdb messenger

# Start Redis
redis-server
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run migrate
npm start
```

Backend runs on: **http://localhost:4000**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: **http://localhost:3000**

## First Time Usage

### Seed Test Users

Create admin and test users with pre-configured contacts:

```bash
cd backend
node seed-users.js
```

This creates:
- **Admin**: `admin` / `Admin123!@#` (full admin access)
- **Test Users**: alice, bob, charlie, diana, eve (all with password: `Admin123!@#`)
- **10 mutual friendships** between test users (ready for messaging)

### Login

**Admin Login:**
1. Go to http://localhost:3000/login
2. Username: `admin`
3. Password: `Admin123!@#`

**Test User Login:**
1. Go to http://localhost:3000/login
2. Username: `alice` (or bob, charlie, diana, eve)
3. Password: `Admin123!@#`
4. Start messaging with pre-configured contacts!

### Register New User

1. Visit http://localhost:3000
2. Click "Register here"
3. Fill form and submit
4. Note: Requires admin approval
5. Login as admin to approve new users

## Test Users (Optional)

Test users are already created by `seed-users.js` script.

**Available Test Users:**
- alice / alice@test.com / Admin123!@#
- bob / bob@test.com / Admin123!@#
- charlie / charlie@test.com / Admin123!@#
- diana / diana@test.com / Admin123!@#
- eve / eve@test.com / Admin123!@#

All test users are pre-configured as mutual friends.

### Quick Test: Send Message

```bash
# Login as Alice
ALICE_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"Admin123!@#"}' | jq -r '.data.tokens.accessToken')

# Get Bob's ID (Alice's contact)
BOB_ID=$(curl -s -X GET http://localhost:4000/api/contacts \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq -r '.data[] | select(.user.username=="bob") | .user.id')

# Send message from Alice to Bob
curl -X POST http://localhost:4000/api/messages \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$BOB_ID\",\"content\":\"Hello Bob!\"}"
```

## Features

✅ User registration & login
✅ Real-time messaging
✅ Typing indicators
✅ Online/offline status
✅ Message history
✅ JWT authentication
✅ WebSocket connection

## Documentation

- [Complete Integration Summary](FINAL_INTEGRATION_SUMMARY.md)
- [Backend Migration Report](backend/CAMELCASE_MIGRATION_REPORT.md)
- [Frontend Integration](frontend/FRONTEND_INTEGRATION_SUMMARY.md)
- [API Spec](docs/api-spec.md)

## Troubleshooting

**Backend won't start**: Check PostgreSQL and Redis are running

**Frontend 401 errors**: Clear localStorage and login again

**WebSocket not connecting**: Verify backend is on port 4000

## Support

Check the issue tracker or documentation files for detailed help.
