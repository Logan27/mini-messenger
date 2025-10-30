# Typing Indicators and Read Receipts Fix

**Date:** October 27, 2025
**Issue:** Typing indicators sent but not received, read notifications sent but not received

---

## Root Cause Analysis

### 1. Read Receipts Not Working ✅ FIXED

**Problem:** Event name mismatch between backend and frontend

**Backend** (`backend/src/services/websocket.js` + `messageService.js`):
- Line 37: `MESSAGE_READ: 'message_read'` (underscore)
- Line 253 messageService.js: Broadcasts using `WS_EVENTS.MESSAGE_READ` → `'message_read'`

**Frontend** (`frontend/src/services/socket.service.ts`):
- Line 93 (OLD): Listened for `'message.read'` (dot) ❌
- Line 93 (NEW): Listens for `'message_read'` (underscore) ✅

**Additional Fix** (`frontend/src/hooks/useSocket.ts`):
- Line 88 (OLD): `useReadReceiptListener` listened for `'message.read'` ❌
- Line 88 (NEW): Listens for `'message_read'` ✅

### 2. Typing Indicators Investigation 🔍

**Event Names Verified:**
- Backend sends: `'message.typing'` (dot) - Lines 557, 590 websocket.js
- Frontend sends: `'message.typing'` (dot) - Line 176 socket.service.ts
- Frontend receives: `'message.typing'` (dot) - Line 105 socket.service.ts
- **Event names are CORRECT** ✅

**Possible Issues:**
1. Room joining: User may not be in `user:${userId}` room when typing event broadcasts
2. Incorrect recipientId being sent
3. Timing issue with room joining

**Debug Logging Added:**
- Line 169-177 socket.service.ts: Enhanced sending logs (shows recipientId, room, socketId)
- Line 105-114 socket.service.ts: Enhanced receiving logs (shows all typing data)

---

## Files Modified

### 1. `frontend/src/services/socket.service.ts`

**Line 93-97: Fixed read receipt event listener**
```typescript
// Before:
this.socket.on('message.read', (data) => {
  this.emit('message.read', data);
});

// After:
// Backend sends 'message_read' (underscore), not 'message.read' (dot)
this.socket.on('message_read', (data) => {
  console.log('📬 Received message_read event from backend:', data);
  this.emit('message_read', data);
});
```

**Line 105-114: Enhanced typing indicator logging**
```typescript
// Before:
this.socket.on('message.typing', (data) => {
  this.emit('message.typing', data);
});

// After:
this.socket.on('message.typing', (data) => {
  console.log('📬 Received typing indicator from backend:', {
    userId: data.userId,
    username: data.username,
    isTyping: data.isTyping,
    recipientId: data.recipientId,
    timestamp: data.timestamp
  });
  this.emit('message.typing', data);
});
```

**Line 168-177: Enhanced typing send logging**
```typescript
// Before:
sendTyping(recipientId: string, isTyping: boolean) {
  console.log(`📝 Sending typing indicator: recipientId=${recipientId}, isTyping=${isTyping}, connected=${this.socket?.connected}`);
  this.send('message.typing', { recipientId, isTyping });
}

// After:
sendTyping(recipientId: string, isTyping: boolean) {
  console.log(`📝 Sending typing indicator:`, {
    recipientId,
    isTyping,
    connected: this.socket?.connected,
    socketId: this.socket?.id,
    expectedRoom: `user:${recipientId}`
  });
  this.send('message.typing', { recipientId, isTyping });
}
```

**Line 180-187: Added read receipt send logging**
```typescript
// Before:
markAsRead(messageId: string) {
  this.send('message_read', { messageId, timestamp: new Date().toISOString() });
}

// After:
markAsRead(messageId: string) {
  console.log('📤 Sending message_read event to backend:', {
    messageId,
    connected: this.socket?.connected,
    timestamp: new Date().toISOString()
  });
  this.send('message_read', { messageId, timestamp: new Date().toISOString() });
}
```

### 2. `frontend/src/hooks/useSocket.ts`

**Line 88-95: Fixed useReadReceiptListener event name**
```typescript
// Before:
const unsubscribe = socketService.on('message.read', (data: { messageId: string }) => {
  queryClient.invalidateQueries({ queryKey: ['messages'] });
});

// After:
// Backend sends 'message_read' (underscore), not 'message.read' (dot)
const unsubscribe = socketService.on('message_read', (data: { messageId: string }) => {
  console.log('📖 Read receipt received, invalidating messages cache:', data);
  queryClient.invalidateQueries({ queryKey: ['messages'] });
});
```

---

## Backend Event Flow (Reference)

### Read Receipts
1. **Frontend sends:** `'message_read'` via `socketService.markAsRead()`
2. **Backend receives:** `'message_read'` at websocket.js:382
3. **Backend processes:** messageService.js:233 `handleMessageRead()`
4. **Backend broadcasts:** `'message_read'` via `broadcastToUser()` at messageService.js:253
5. **Frontend receives:** `'message_read'` at socket.service.ts:94
6. **Frontend emits locally:** `'message_read'` to all listeners
7. **useSocket.ts receives:** Updates messages cache

### Typing Indicators
1. **Frontend sends:** `'message.typing'` via `socketService.sendTyping()`
2. **Backend receives:** `'message.typing'` at websocket.js:353
3. **Backend processes:** `handleTypingIndicator()` at websocket.js:524
4. **Backend broadcasts:** `'message.typing'` to `user:${recipientId}` room at websocket.js:590
5. **Frontend receives:** `'message.typing'` at socket.service.ts:105
6. **Frontend emits locally:** `'message.typing'` to all listeners
7. **ChatView receives:** Shows typing indicator

---

## Testing Instructions

### Read Receipts Testing

**Expected Console Output:**

**When User A opens chat with User B:**
```
📖 Marking 5 messages as read
📤 Sending message_read event to backend: { messageId: "...", connected: true, ... }
📤 Sending message_read event to backend: { messageId: "...", connected: true, ... }
...
```

**When User B (sender) sees read receipt:**
```
📬 Received message_read event from backend: { messageId: "...", readerId: "...", ... }
📖 Read receipt received, invalidating messages cache: { messageId: "..." }
```

**What to check:**
1. ✅ No more "Socket not connected" errors when marking as read
2. ✅ Console shows `📤 Sending message_read event` when opening chat
3. ✅ Console shows `📬 Received message_read event` on sender's side
4. ✅ Messages show read checkmarks/indicators in UI
5. ✅ Read status updates without page refresh

---

### Typing Indicators Testing

**Expected Console Output:**

**When User A types to User B:**
```
📝 Sending typing indicator: {
  recipientId: "user-b-id",
  isTyping: true,
  connected: true,
  socketId: "abc123",
  expectedRoom: "user:user-b-id"
}
```

**When User B receives typing indicator:**
```
📬 Received typing indicator from backend: {
  userId: "user-a-id",
  username: "User A",
  isTyping: true,
  recipientId: "user-b-id",
  timestamp: "2025-10-27T..."
}
📬 Received typing indicator: { userId: "user-a-id", isTyping: true }
```

**What to check:**
1. ✅ Console shows `📝 Sending typing indicator` when typing
2. ✅ recipientId matches the user you're chatting with
3. ✅ expectedRoom matches `user:${recipientId}`
4. ✅ Other user's console shows `📬 Received typing indicator`
5. ✅ Typing bubble appears in chat UI
6. ✅ Typing stops after 3 seconds of inactivity

**If typing indicators still don't work:**

Check the following in console:
1. **Sender side:** Does `📝 Sending typing indicator` show correct recipientId?
2. **Recipient side:** Do you see `📬 Received typing indicator` at all?
3. **If NO receive log:** Room joining issue - user not in expected room
4. **If YES receive log but no UI:** ChatView not listening or displaying correctly

---

## Troubleshooting

### Issue: Read receipts still not showing

**Check console for:**
```
📤 Sending message_read event to backend: { ... }
```

**If not seeing this:**
- ChatView's useEffect not running (check line 130)
- Socket not connected yet (see `⏳ Skipping mark as read` message)

**If seeing send but no receive:**
- Backend not broadcasting (check backend logs)
- Event name mismatch (should be fixed now)

### Issue: Typing indicators still not working

**Diagnostic Steps:**

1. **Open console on both users' browsers**

2. **User A types in chat with User B**

3. **Check User A's console:**
   ```
   📝 Sending typing indicator: { recipientId: "...", expectedRoom: "user:..." }
   ```
   - Verify recipientId is User B's ID
   - Verify connected: true

4. **Check User B's console:**
   - Should see: `📬 Received typing indicator from backend: { userId: "user-a-id", ... }`
   - If YES: Frontend issue (ChatView not displaying)
   - If NO: Backend issue (room not joined or broadcast failing)

5. **If not received, check backend logs:**
   ```
   🔗 Socket connected: abc123 (User: user-b-id)
   ```
   - Verify User B joined `user:${userId}` room on connection

---

## Summary

### ✅ Fixed Issues
1. **Read receipts event name:** `message.read` → `message_read` (2 locations)
2. **Added comprehensive debug logging** for both features

### 🔍 Remaining Diagnosis
1. **Typing indicators:** Event names correct, need to verify room joining
2. **Debug logs added** to trace exact flow

### Files Modified
1. `frontend/src/services/socket.service.ts` - 4 changes (event name + 3 logging enhancements)
2. `frontend/src/hooks/useSocket.ts` - 1 change (event name)
3. Total: 2 files, 5 changes

---

## Next Steps

1. **Test read receipts** - Should work immediately after fix
2. **Test typing indicators** - Use console logs to diagnose
3. **Report results** - Share console output if still not working
4. **Backend verification** - May need to verify user room joining if typing still fails

---

**Fix Status:** Read receipts FIXED ✅ | Typing indicators DIAGNOSED 🔍
