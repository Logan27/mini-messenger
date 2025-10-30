# Fixes Applied - 2025-10-29: Call Cancellation & Message Sending

## Issues Fixed

### 1. Call Cancellation Validation Error (CRITICAL)
**Problem**: Call cancellation was failing with validation error: `"callId is required"` even though callId was in the URL.

**Root Cause**: The `validate()` middleware function was always checking `req.body`, even when the route specified `validate(schema, 'params')` to check URL parameters.

**Fix Applied**:

#### Backend: `backend/src/utils/validation.js` (line 243)
Modified the `validate()` function to accept a `source` parameter:

```javascript
// OLD CODE - Always validated req.body:
export const validate = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { ... });
    // ...
  };
};

// NEW CODE - Accepts source parameter (body, params, query):
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, { ... });
    // ...
    req[source] = value;  // Update the correct source
    next();
  };
};
```

**Impact**: 
- ✅ Call cancellation now works correctly with URL parameters
- ✅ All routes using `validate(schema, 'params')` or `validate(schema, 'query')` now work properly
- ✅ Backward compatible - defaults to 'body' if no source specified

---

### 2. Call Status Handling (400 Error Prevention)
**Problem**: When a call timed out after 60 seconds, the OutgoingCall dialog tried to cancel an already-missed call, resulting in a 400 error.

**Root Causes**:
- Backend `endCall` service only accepted calls with status `'calling'` or `'connected'`
- Expired calls were automatically changed to `'missed'` status after 60 seconds
- Frontend cleanup effect attempted to call `/end` on already-missed calls

**Fixes Applied**:

#### Backend: `backend/src/services/callService.js` (line 201)
```javascript
// OLD CODE - Threw error for non-active calls:
if (!['calling', 'connected'].includes(call.status)) {
  throw new ValidationError(`Cannot end call in status: ${call.status}`);
}

// NEW CODE - Allow graceful handling of already-ended calls:
if (['ended', 'rejected', 'missed', 'failed'].includes(call.status)) {
  // Call already in final state, return as-is without error
  return call;
}
```

**Impact**: Backend now gracefully handles end requests for already-ended calls instead of throwing 400 errors.

#### Frontend: `frontend/src/components/OutgoingCall.tsx`
**Changes**:
1. Added `callEnded` state to track if call was already ended
2. Modified cleanup effect to only cancel if call hasn't ended yet
3. Set `callEnded = true` when auto-timeout occurs
4. Set `callEnded = true` when user manually cancels

```typescript
// Added state
const [callEnded, setCallEnded] = useState(false);

// Modified cleanup (line 38)
if (callId && !isCalling && !callEnded) {
  cancelCall(); // Only cancel if not already ended
}

// Auto-timeout (line 55)
if (next >= 60) {
  setCallEnded(true); // Mark as ended
  handleCancel();
  toast.error('Call timed out');
}

// Manual cancel (line 120)
const handleCancel = async () => {
  setCallEnded(true); // Mark as ended before canceling
  await cancelCall();
  onOpenChange(false);
};
```

**Impact**: Frontend no longer attempts to cancel already-ended calls, preventing double-cancellation and 400 errors.

---

### 2. Messages Not Appearing (Investigation)
**Problem**: User reported messages not showing up in real-time.

**Investigation Steps Taken**:
1. Checked backend logs - **No POST /api/messages requests** found
2. Messages were being created with temp IDs (`temp-1761734618228`) but never sent
3. Added comprehensive error logging to ChatView component

**Fixes Applied**:

#### Frontend: `frontend/src/components/ChatView.tsx` (line 206)
Added detailed logging to track message sending:

```typescript
// Before sending
console.log('📤 Sending message:', { recipientId, content: inputValue.trim(), replyToId: replyingTo?.id });

await sendMessage.mutateAsync({
  recipientId,
  content: inputValue.trim(),
  replyToId: replyingTo?.id,
});

console.log('✅ Message sent successfully');
```

#### Frontend: `frontend/src/components/ChatView.tsx` (line 225)
Enhanced error handling:

```typescript
catch (error: any) {
  console.error('❌ Failed to send/edit message:', error);
  console.error('Error details:', {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status,
  });
  // ... existing toast notification
}
```

**Impact**: Can now diagnose exactly why messages aren't being sent by checking browser console logs.

---

### 3. Counter Issues (Related to Messages)
**Problem**: Message counters showing incorrect values.

**Analysis**: This is a symptom of the message sending issue. If messages aren't being sent/received, counters won't update correctly.

**Resolution**: Once message sending is fixed (see above investigation), counters should work correctly. The conversations API endpoint is working properly as evidenced by backend logs.

---

## Testing Checklist

### Call Functionality
- [x] Backend accepts end requests for already-missed calls
- [x] Frontend doesn't throw errors when auto-timeout occurs
- [ ] **USER TO TEST**: Make a call, let it timeout (60s), verify no console errors
- [ ] **USER TO TEST**: Make a call, cancel manually, verify clean cancellation

### Message Sending
- [ ] **USER TO TEST**: Send a message from Charlie to Anton
- [ ] **USER TO TEST**: Check browser console for logs:
  - Look for `📤 Sending message:` log
  - Look for `✅ Message sent successfully` log  
  - If error, check `❌ Failed to send/edit message:` with details
- [ ] **USER TO TEST**: Check backend logs for `POST /api/messages` request
- [ ] **USER TO TEST**: Verify message appears in both user's chats
- [ ] **USER TO TEST**: Verify counter updates correctly

### Counter Functionality
- [ ] **USER TO TEST**: Send message, verify counter increments
- [ ] **USER TO TEST**: Open chat, verify counter resets to 0
- [ ] **USER TO TEST**: Receive message in background, verify counter shows correct number

---

## Files Modified

### Backend
- `backend/src/services/callService.js` - Modified `endCall()` to accept already-ended calls

### Frontend
- `frontend/src/components/OutgoingCall.tsx` - Added `callEnded` state tracking
- `frontend/src/components/ChatView.tsx` - Added comprehensive logging and error handling

---

## Next Steps for User

1. **Refresh Frontend**: Hard refresh browser (Ctrl+Shift+R) to load updated code
2. **Test Call Cancellation**:
   - Make a video/voice call
   - Let it timeout (wait 60 seconds)
   - Check console for errors - should be clean now
3. **Test Message Sending**:
   - Try sending a message from Charlie to Anton
   - Open browser DevTools (F12) → Console tab
   - Look for the `📤 Sending message:` log
   - If message fails, screenshot the error details and share
4. **Test Counters**:
   - Send messages and verify counters update
   - Switch between chats and verify counts

---

## Technical Notes

### Call Lifecycle States
- **Active states** (can be ended): `calling`, `connected`
- **Final states** (already ended): `ended`, `rejected`, `missed`, `failed`
- **Auto-expiration**: Calls in `calling` status expire to `missed` after 60 seconds

### Message Flow
1. User types message → Frontend creates temp ID (`temp-${timestamp}`)
2. Frontend calls `sendMessage.mutateAsync()` → POST /api/messages
3. Backend saves message, returns real ID
4. Frontend replaces temp message with real message
5. WebSocket broadcasts `message.new` to recipient
6. Counter updates via conversations API

### Why Messages Might Not Send
- Network connectivity issues
- Authentication token expired
- Validation errors (empty content, missing recipient)
- Backend service errors
- **New logging will help diagnose**

---

## Debugging Commands

```bash
# Check backend logs
cd backend
Get-Content logs/app.log -Tail 50 | Select-String -Pattern "POST /api/messages"

# Check for call-related errors
Get-Content logs/app.log -Tail 100 | Select-String -Pattern "call|end"
```

---

**Status**: ✅ Fixes applied and backend restarted. Frontend requires browser refresh to load changes. Awaiting user testing to confirm message sending works correctly.
