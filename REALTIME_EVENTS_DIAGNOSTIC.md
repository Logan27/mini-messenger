# Real-Time Events Diagnostic Guide

## Current Status

Based on your console logs, the issue is clear:

### ✅ Working:
- Socket connection established: `KjgIbAowDBwko0YBAAAT`
- All listeners registered correctly (8 event types)
- Frontend **sending** events to backend:
  - `📝 Sending typing indicator` (4 times)
  - `📤 Sending message_read event` (multiple messages)

### ❌ NOT Working:
- **NO incoming events from backend**
- No `📬 Typing event received` logs
- No `📖 Read receipt received` logs
- No `💬 Received message via socket` logs

### Root Cause:
Backend is likely:
1. Not emitting events at all, OR
2. Emitting to the wrong room, OR
3. Backend logs would show errors

## Diagnostic Steps

### Step 1: Check Backend Logs

**Start backend with logging**:
```bash
cd backend
npm run dev
```

**Look for these logs when you type a message**:

#### When typing:
```
📡 WebSocket: Broadcasting to user:4026fb9f-16c2-42b0-a692-901d8df5102b event: message.typing
```

#### When marking as read:
```
👁️ Message read: <messageId> by <userId>
📡 WebSocket: Broadcasting to user:<senderId> event: message_read
```

**If you DON'T see these logs** → Backend handler is failing silently

### Step 2: Enable Backend Debug Mode

Add this to your backend console to see ALL Socket.IO events:

```javascript
// In backend/src/services/websocket.js, add after line 869:
console.log('📡 Emitting event:', event, 'to room:', `user:${userId}`, 'with data:', JSON.stringify(data).substring(0, 100));
console.log('📡 Rooms this socket is in:', Array.from(this.io.sockets.adapter.rooms.keys()));
```

### Step 3: Test Backend Room Membership

**Open second browser tab/window with a different user**

**User B (recipient) console**:
```javascript
// Check what rooms the socket joined
window.socketService.socket.rooms
// Should show: Set(2) { "socketId", "user:B's-userId" }
```

**User A (sender) types** → Backend should emit to `user:B's-userId`

### Step 4: Verify Event Names Match

**Backend emits** (from websocket.js:869):
```javascript
this.io.to(`user:${userId}`).emit(event, data);
// event = 'message_read' (underscore)
// event = 'message.typing' (dot)
```

**Frontend listens** (from socket.service.ts:103, 115):
```javascript
this.socket.on('message_read', ...)  // underscore ✅
this.socket.on('message.typing', ...) // dot ✅
```

**Event names match!** ✅

### Step 5: Test Manual Emit

**From backend console or Node REPL**:

```javascript
// Get the WebSocket service
const { getWebSocketService } = require('./src/services/websocket.js');
const wsService = getWebSocketService();

// Manual test emit
wsService.broadcastToUser('ac42b144-8cce-43da-91d9-4c7d0fcc2393', 'message.typing', {
  userId: '4026fb9f-16c2-42b0-a692-901d8df5102b',
  isTyping: true
});
```

**Check frontend console** → Should see `📬 Typing event received`

If this WORKS → Problem is in the handler logic
If this DOESN'T work → Problem is in Socket.IO room/connection

## Most Likely Issues

### Issue 1: Backend Handler Not Being Called

**Symptoms**: No backend logs when you type or send read receipts

**Cause**: Event handler registration might be failing

**Fix**: Check backend logs for errors during WebSocket initialization

**Test**:
```bash
# Backend console should show on startup:
✅ User <userId> joined room: user:<userId>
```

### Issue 2: Room Not Joined Properly

**Symptoms**: Backend emits but frontend doesn't receive

**Cause**: Socket didn't join the `user:userId` room

**Check backend logs for**:
```
✅ User ac42b144-8cce-43da-91d9-4c7d0fcc2393 joined room: user:ac42b144-8cce-43da-91d9-4c7d0fcc2393
```

**If missing** → Check websocket.js line 316

### Issue 3: Backend Crashes Silently

**Symptoms**: First few events work, then nothing

**Cause**: Uncaught exception in handler

**Fix**: Wrap handlers in try-catch, check for:
```javascript
TypeError: Cannot read property 'senderId' of undefined
```

### Issue 4: CORS/Transport Issue

**Symptoms**: Connection works but events don't

**Cause**: Fallback to polling instead of WebSocket

**Check frontend console**:
```javascript
window.socketService.socket.io.engine.transport.name
// Should be: "websocket" not "polling"
```

## Quick Fix Script

**Add this to backend/src/services/websocket.js** around line 870:

```javascript
async broadcastToUser(userId, event, data) {
  console.log('🔥 BROADCAST DEBUG:', {
    userId,
    event,
    room: `user:${userId}`,
    dataKeys: Object.keys(data),
    ioExists: !!this.io,
    roomSockets: this.io?.sockets.adapter.rooms.get(`user:${userId}`)?.size || 0
  });

  const room = `user:${userId}`;
  const socketsInRoom = this.io?.sockets.adapter.rooms.get(room);

  if (!socketsInRoom || socketsInRoom.size === 0) {
    console.warn(`⚠️ No sockets in room: ${room}. User might be offline.`);
    return;
  }

  console.log(`📡 Emitting ${event} to ${socketsInRoom.size} socket(s) in room: ${room}`);
  this.io.to(room).emit(event, data);
  console.log(`✅ Emit complete for event: ${event}`);
}
```

**This will show**:
- If room exists
- How many sockets are in the room
- Exact event being emitted
- Confirmation of emit completion

## Expected Output

### When Working Correctly:

**Backend logs** (when User A types to User B):
```
📡 WebSocket: Broadcasting to user:B-userId event: message.typing
🔥 BROADCAST DEBUG: { userId: 'B-userId', event: 'message.typing', room: 'user:B-userId', roomSockets: 1 }
📡 Emitting message.typing to 1 socket(s) in room: user:B-userId
✅ Emit complete for event: message.typing
```

**Frontend logs** (User B's console):
```
🔵 Socket.IO received: message.typing { userId: 'A-userId', isTyping: true }
📢 Emitting event: message.typing, listeners: 1
📬 Typing event received: { userId: 'A-userId', isTyping: true, matches: true }
✅ Setting isTyping to: true
```

### When NOT Working:

**Backend shows**:
```
⚠️ No sockets in room: user:B-userId. User might be offline.
```
→ User B's socket didn't join the room

OR

**No backend logs at all**:
```
(silence)
```
→ Handler not being called, check event name registration

## Action Items

1. **Start backend** with `npm run dev` and monitor logs
2. **Open two browser tabs** with different users
3. **User A types** to User B
4. **Check backend console** for broadcast logs
5. **Check User B's frontend console** for received events
6. **Share the backend logs** if events aren't being emitted

## Debug Commands

```bash
# Backend - check if WebSocket service is initialized
cd backend
node -e "const { getWebSocketService } = require('./src/services/websocket.js'); console.log('WS Service:', getWebSocketService() ? 'EXISTS' : 'NULL');"

# Backend - test manual emit (adjust userId)
node -e "const { getWebSocketService } = require('./src/services/websocket.js'); const ws = getWebSocketService(); ws.broadcastToUser('ac42b144-8cce-43da-91d9-4c7d0fcc2393', 'test.event', { test: true });"
```

## Notification Permission Fix

For Windows notifications, run in frontend console:

```javascript
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
  if (permission === 'granted') {
    new Notification('Test', { body: 'Notifications are working!' });
  } else {
    console.log('Go to Chrome Settings → Privacy → Notifications → Allow localhost');
  }
});
```

---

**Next Step**: Share your backend console output when typing/sending messages!
