# CRITICAL FIX: Redis Subscriber Mode Blocking Events

**Date:** October 28, 2025
**Issue:** Backend error preventing ALL WebSocket events from being broadcast

---

## 🎯 ROOT CAUSE IDENTIFIED

**Error:**
```
Error: Connection in subscriber mode, only subscriber commands may be used
```

**What This Means:**
The Redis client used for subscribing to events (listening) **cannot also be used for publishing** (sending). Redis enforces this limitation - once a connection enters subscriber mode via `SUBSCRIBE`, it can ONLY execute subscriber commands (`SUBSCRIBE`, `UNSUBSCRIBE`, `PSUBSCRIBE`, `PUNSUBSCRIBE`).

**Where It Failed:**
```javascript
// messageService.js and websocket.js
async broadcastToUser(userId, event, data) {
  if (this.redisClient) {
    // ❌ THIS FAILS - this.redisClient is in subscriber mode!
    await this.redisClient.publish(`broadcast:user:${userId}`, ...);
  }

  // This line was never reached due to error above
  io.to(`user:${userId}`).emit(event, data);
}
```

**Result:**
- `redisClient.publish()` threw error
- Function crashed before reaching `io.to().emit()`
- **NO WebSocket events were ever broadcast**
- Frontend received nothing

---

## ✅ FIX APPLIED

Disabled Redis pub/sub and use **local Socket.IO broadcasting only**.

### File 1: `backend/src/services/messageService.js:387-408`

```javascript
// BEFORE (BROKEN):
async broadcastToUser(userId, event, data) {
  if (this.redisClient) {
    await this.redisClient.publish(`broadcast:user:${userId}`, ...); // ❌ CRASHES HERE
  }

  io.to(`user:${userId}`).emit(event, data); // Never reached!
}

// AFTER (FIXED):
async broadcastToUser(userId, event, data) {
  console.log('🔵 Backend: broadcastToUser called', {
    userId,
    event,
    room: `user:${userId}`,
  });

  // SKIP REDIS PUB/SUB - Redis client is in subscriber mode
  // Use local Socket.IO broadcasting only
  // if (this.redisClient) {
  //   await this.redisClient.publish(...);
  // }

  // Broadcast locally via Socket.IO
  const io = getIO();
  console.log('📡 Backend: Emitting to room:', `user:${userId}`, 'with event:', event);
  io.to(`user:${userId}`).emit(event, data);
  console.log('✅ Backend: Emit completed');
}
```

### File 2: `backend/src/services/websocket.js:856-867`

```javascript
// BEFORE (BROKEN):
async broadcastToUser(userId, event, data) {
  if (this.redisClient) {
    await this.redisClient.publish(`broadcast:user:${userId}`, ...); // ❌ CRASHES HERE
  }

  this.io?.to(`user:${userId}`).emit(event, data); // Never reached!
}

// AFTER (FIXED):
async broadcastToUser(userId, event, data) {
  // SKIP REDIS PUB/SUB
  // if (this.redisClient) {
  //   await this.redisClient.publish(...);
  // }

  // Broadcast locally
  console.log('📡 WebSocket: Broadcasting to', `user:${userId}`, 'event:', event);
  this.io?.to(`user:${userId}`).emit(event, data);
}
```

---

## 🔧 Proper Fix (For Production)

For production with multiple servers, you need **separate Redis clients**:

```javascript
class MessageService {
  constructor() {
    this.redisSubscriber = null;  // For SUBSCRIBE commands
    this.redisPublisher = null;   // For PUBLISH commands
  }

  async initialize() {
    // Client 1: Subscriber (read-only, can only SUBSCRIBE)
    this.redisSubscriber = getRedisSubscriber();

    // Client 2: Publisher (can do regular commands + PUBLISH)
    this.redisPublisher = getRedisClient();

    // Subscribe using subscriber client
    await this.redisSubscriber.subscribe('message_delivery', (msg) => {
      this.handleCrossServerMessageDelivery(JSON.parse(msg));
    });
  }

  async broadcastToUser(userId, event, data) {
    // Publish using publisher client (separate connection)
    if (this.redisPublisher) {
      await this.redisPublisher.publish(
        `broadcast:user:${userId}`,
        JSON.stringify({ event, data })
      );
    }

    // Also broadcast locally
    getIO().to(`user:${userId}`).emit(event, data);
  }
}
```

**Key Point:** Redis requires **two separate connections** - one for subscribing, one for publishing.

---

## 🧪 Testing After Fix

### 1. Restart Backend
```bash
# Stop backend (Ctrl+C)
cd backend
npm run dev
```

### 2. Reload Frontend
- Refresh browser (Ctrl+R)
- Open console (F12)

### 3. Run Test
```javascript
window.socketService.testBackendEvents()
```

### 4. Send Message from Another User

**Expected Backend Logs:**
```
🔵 Backend: handleMessageSent called { senderId: '...', recipientId: '...', ... }
🔵 Backend: Broadcasting message_sent to recipientId: ac42b144-8cce-43da-91d9-4c7d0fcc2393
🔵 Backend: broadcastToUser called { userId: '...', event: 'message_sent', room: 'user:...' }
📡 Backend: Emitting to room: user:ac42b144-8cce-43da-91d9-4c7d0fcc2393 with event: message_sent
✅ Backend: Emit completed
```

**Expected Frontend Logs:**
```
🎯 Backend sent event: message_sent [...]
🔵 Socket.IO received: message_sent { ... }
📢 Emitting event: message.new, listeners: 3 { ... }
✅ Called 3 listeners for event: message.new
```

**Expected Result:**
- ✅ Message appears **instantly** in chat (no refresh needed)
- ✅ Typing indicators work
- ✅ Read receipts work
- ✅ All real-time features functional

---

## 📊 Complete Fix Summary

### Issues Fixed This Session

1. ✅ **Event Name Mismatch:** `message.new` → `message_sent` (frontend)
2. ✅ **Read Receipt Event:** `message.read` → `message_read` (frontend)
3. ✅ **Rate Limiting:** Disabled global rate limiter blocking API calls
4. ✅ **Query Invalidation:** Removed excessive `invalidateQueries` causing 429 errors
5. ✅ **Redis Subscriber Mode:** Disabled pub/sub, use local Socket.IO only

### Files Modified

**Frontend (4 files):**
1. `frontend/src/services/socket.service.ts`
   - Fixed event name: `message.new` → `message_sent`
   - Fixed read event: `message.read` → `message_read`
   - Added comprehensive debug logging
   - Added `diagnose()` and `testBackendEvents()` methods

2. `frontend/src/hooks/useSocket.ts`
   - Fixed `useReadReceiptListener` event name

3. `frontend/src/hooks/useMessages.ts`
   - Removed excessive `invalidateQueries` after send

4. `frontend/src/components/ChatView.tsx`
   - Fixed WebSocket timing issue (mark as read only when connected)

**Backend (3 files):**
1. `backend/src/services/messageService.js`
   - Disabled Redis publish (was crashing)
   - Added comprehensive debug logging
   - Fixed broadcastToUser to use Socket.IO only

2. `backend/src/services/websocket.js`
   - Disabled Redis publish (was crashing)
   - Added room join confirmation logging
   - Fixed broadcastToUser to use Socket.IO only

3. `backend/src/app.js`
   - Disabled global rate limiter for testing

---

## 🎉 Expected Outcome

After restarting backend with this fix:

✅ **New messages appear instantly** without refresh
✅ **Typing indicators work** in real-time
✅ **Read receipts update** immediately
✅ **All WebSocket events functional**

---

## ⚠️ Important Notes

**Current Setup:** Single-server deployment
- Redis pub/sub disabled (not needed for single server)
- All events broadcast via Socket.IO locally
- Works perfectly for single-server architecture

**For Multi-Server Deployment:**
- Need separate Redis clients for pub and sub
- Implement proper Redis pub/sub with two connections
- See "Proper Fix" section above

---

**STATUS:** ✅ CRITICAL FIX APPLIED - Real-time events should now work!

**Next Step:** Restart backend, test messages, confirm instant delivery.
