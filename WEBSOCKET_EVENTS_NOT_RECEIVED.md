# WebSocket Events Not Received - Diagnostic Guide

**Issue:** No real-time events received at all - new messages don't appear until page refresh

**Date:** October 27, 2025

---

## Comprehensive Debug Logging Added

I've added extensive logging throughout the WebSocket event flow to trace exactly where the issue occurs.

### Debug Log Flow

When everything works correctly, you should see logs in this order:

#### 1. Connection Phase
```
🔵 Connecting to WebSocket: http://localhost:4000
🎧 Setting up message listeners on socket: <socket-id>
✅ All message listeners set up successfully
✅ WebSocket connected, socket ID: <socket-id>
📋 Current listeners registered: [...]
```

#### 2. Component Subscription Phase
```
🔔 Registered listener for event: message.new, total listeners: 1
🔔 Registered listener for event: message.new, total listeners: 2
🔔 Registered listener for event: message_read, total listeners: 1
🔔 Registered listener for event: user.status, total listeners: 1
...
```

#### 3. Message Reception Phase (when someone sends you a message)
```
🔵 Socket.IO received: message.new { id: "...", content: "...", ... }
📢 Emitting event: message.new, listeners: 2 { ... }
✅ Called 2 listeners for event: message.new
```

---

## Diagnostic Steps

### Step 1: Check Connection Setup

Open browser console and look for these logs when page loads:

**✅ Expected:**
```
🔵 Connecting to WebSocket: http://localhost:4000
🎧 Setting up message listeners on socket: <socket-id>
✅ All message listeners set up successfully
✅ WebSocket connected, socket ID: <socket-id>
```

**❌ If missing:**
- `🎧 Setting up message listeners` → setupMessageListeners() not called
- `✅ WebSocket connected` → Connection failed

### Step 2: Check Listener Registration

After page loads, look for:

**✅ Expected:**
```
🔔 Registered listener for event: message.new, total listeners: 1
🔔 Registered listener for event: message.new, total listeners: 2
🔔 Registered listener for event: connection.status, total listeners: 1
🔔 Registered listener for event: message_read, total listeners: 1
```

**❌ If missing:**
- No `🔔 Registered listener` logs → Components not subscribing
- Check if Index.tsx and useMessages hooks are mounting

### Step 3: Run Manual Diagnostic

Open browser console and type:
```javascript
window.socketService.diagnose()
```

**Expected output:**
```
🔍 Socket Service Diagnostics:
  Connected: true
  Socket ID: "abc123xyz"
  Is Connecting: false
  Is Reconnecting: false
  Registered Listeners:
    message.new: 2 listener(s)
    message_read: 1 listener(s)
    connection.status: 1 listener(s)
    user.status: 1 listener(s)
  Socket.IO Listeners (on socket object):
    ['connect', 'disconnect', 'reconnect_attempt', 'error', 'message.new', 'message_read', ...]
```

**Check:**
- `Connected: true` → If false, connection issue
- `message.new` should have at least 1 listener (preferably 2 from Index.tsx)
- Socket.IO Listeners should include all the event types

### Step 4: Test Message Sending

Send a message from another user to yourself. Watch console:

**✅ Expected flow:**
```
🔵 Socket.IO received: message.new { id: "123", content: "test", senderId: "...", ... }
📢 Emitting event: message.new, listeners: 2 { ... }
✅ Called 2 listeners for event: message.new
```

**❌ Problem scenarios:**

1. **No logs at all**
   - Backend not sending event
   - Wrong room/user ID
   - Socket not actually connected (check backend logs)

2. **Only see `🔵 Socket.IO received:`**
   - Local emit() not being called (bug in socket.service.ts)
   - Check the code between socket.on() and this.emit()

3. **See `📢 Emitting event:` but `listeners: 0`**
   - Components not subscribed
   - Components unmounted
   - useMessages/useMessageListener not being used

4. **See `⚠️ No listeners registered for event:`**
   - Event name mismatch
   - Components haven't subscribed yet
   - React Strict Mode causing unsubscribe/resubscribe issues

---

## Common Issues and Fixes

### Issue 1: Backend Not Sending Events

**Check backend logs for:**
```
🔗 Socket connected: <socket-id> (User: <user-id>)
```

When message is sent, should see:
```
Broadcasting message to user: <recipient-id>
```

**If not seeing broadcasts:**
- Check recipientId is correct
- Check user is in `user:${userId}` room
- Check backend WebSocket is working

**Backend diagnostic (in backend terminal):**
```bash
# Check if Socket.IO is running
curl http://localhost:4000/socket.io/?EIO=4&transport=polling

# Should return Socket.IO handshake JSON
```

### Issue 2: Wrong Event Names

**Verify event name consistency:**

Frontend listens for:
- `message.new` (dot)
- `message_read` (underscore)
- `message.typing` (dot)

Backend sends (check `backend/src/services/websocket.js` line 20-40):
- Should match exactly

### Issue 3: Components Not Subscribing

**Check these files are imported and used:**

`frontend/src/pages/Index.tsx`:
- Line 10: Imports `useMessageListener`
- Line 26: Uses `useMessages`
- Line 31: Calls `useMessageListener()`

If these are missing or not being called, real-time updates won't work.

### Issue 4: React Strict Mode Double-Mount

React Strict Mode causes components to mount/unmount/remount in development, which might cause listener issues.

**Check for this pattern:**
```
🔔 Registered listener for event: message.new, total listeners: 1
🔕 Unregistered listener for event: message.new, remaining: 0
🔔 Registered listener for event: message.new, total listeners: 1
```

This is NORMAL in development. As long as there's at least 1 listener after mounting completes, it's fine.

---

## Testing Script

Copy this into browser console to test the event flow:

```javascript
// 1. Check connection status
console.log('=== Connection Status ===');
window.socketService.diagnose();

// 2. Listen for test event
console.log('\n=== Setting up test listener ===');
const unsubscribe = window.socketService.on('test.event', (data) => {
  console.log('✅ Test event received:', data);
});

// 3. Emit test event to self
console.log('\n=== Emitting test event ===');
window.socketService.send('test.event', { message: 'Hello from console!' });

// 4. Clean up
setTimeout(() => {
  unsubscribe();
  console.log('\n=== Test listener unsubscribed ===');
}, 1000);
```

---

## Files Modified for Debugging

### `frontend/src/services/socket.service.ts`

1. **Line 55-56:** Enhanced connect log with socket ID and listeners
2. **Line 90:** Added `🎧 Setting up message listeners` log
3. **Lines 93-141:** Added `🔵 Socket.IO received:` logs for ALL events
4. **Line 144:** Added `✅ All message listeners set up successfully`
5. **Line 200:** Added `🔔 Registered listener` log
6. **Line 207:** Added `🔕 Unregistered listener` log
7. **Line 218:** Added `📢 Emitting event` log with listener count
8. **Line 221:** Added `✅ Called N listeners` log
9. **Line 223:** Added `⚠️ No listeners registered` warning
10. **Lines 245-259:** Added `diagnose()` method
11. **Lines 266-268:** Exposed socketService to window for console access

---

## Expected Console Output (Full Session)

### On Page Load:
```
🔵 Connecting to WebSocket: http://localhost:4000
🎧 Setting up message listeners on socket: undefined
✅ All message listeners set up successfully
✅ WebSocket connected, socket ID: abc123xyz
📋 Current listeners registered: connection.status (1 listeners)
🔔 Registered listener for event: connection.status, total listeners: 2
🔔 Registered listener for event: message.new, total listeners: 1
🔔 Registered listener for event: message.new, total listeners: 2
🔔 Registered listener for event: message_read, total listeners: 1
🔔 Registered listener for event: user.status, total listeners: 1
```

### When Message Received:
```
🔵 Socket.IO received: message.new {
  id: "msg-123",
  content: "Hello!",
  senderId: "user-456",
  recipientId: "user-789",
  ...
}
📢 Emitting event: message.new, listeners: 2 {
  id: "msg-123",
  content: "Hello!",
  ...
}
✅ Called 2 listeners for event: message.new
```

### When Typing:
```
📝 Sending typing indicator: {
  recipientId: "user-456",
  isTyping: true,
  connected: true,
  socketId: "abc123xyz",
  expectedRoom: "user:user-456"
}
🔵 Socket.IO received: message.typing {
  userId: "user-456",
  username: "John Doe",
  isTyping: true,
  ...
}
📢 Emitting event: message.typing, listeners: 1 { ... }
✅ Called 1 listeners for event: message.typing
```

### When Message Read:
```
📤 Sending message_read event to backend: {
  messageId: "msg-123",
  connected: true,
  timestamp: "2025-10-27T..."
}
🔵 Socket.IO received: message_read {
  messageId: "msg-123",
  readerId: "user-789",
  ...
}
📢 Emitting event: message_read, listeners: 1 { ... }
✅ Called 1 listeners for event: message_read
```

---

## Next Steps

1. **Load the application** and check console for the connection logs
2. **Run `window.socketService.diagnose()`** in console
3. **Send a test message** from another user and watch for `🔵 Socket.IO received:` logs
4. **Report the results** - specifically which logs you see and which are missing

The extensive logging will pinpoint exactly where the flow breaks:
- ❌ No `🎧 Setting up` → Connection not initialized
- ❌ No `🔔 Registered listener` → Components not subscribing
- ❌ No `🔵 Socket.IO received` → Backend not sending or wrong room
- ❌ No `📢 Emitting event` → Local emit not called
- ❌ `listeners: 0` → Components subscribed but unsubscribed

---

**Debug Mode Active** 🔍

All WebSocket event flow is now fully instrumented. Share the console output and we'll identify the exact issue.
