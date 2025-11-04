# Diagnose WebSocket Notification Issue

## New Logging Added

I've added comprehensive logging to track the entire flow:

### 1. When Settings Are Loaded
```
🔄 loadSettings() called - fetching from API...
🔔 Loaded notification settings from API: {...}
🔔 Setting state with new settings...
✅ State update called with: {...}
```

### 2. When State Actually Changes
```
🔄 notificationSettings STATE CHANGED TO: {...}
```

### 3. When useEffect Re-runs (due to state change)
```
🔔 Global notifications handler initialized
🔔 Current notification settings in effect: {...}
```

## Diagnostic Steps

### Step 1: Check WebSocket Connection

1. Open Alice's browser
2. Press F12 → Network tab
3. Filter by "WS" (WebSocket)
4. Look for active WebSocket connection to `localhost:4000`
5. Check Status: Should be "101 Switching Protocols" or "Pending" (green)

**If no WebSocket connection:**
- Page didn't establish WebSocket
- Try refreshing the page

### Step 2: Toggle Setting and Watch Console

1. Open Alice's Settings → Notifications
2. Keep Console tab open
3. Toggle "Direct Messages" OFF
4. Watch for these logs **IN ORDER**:

**Frontend (NotificationSettings component):**
```
🔧 NotificationSettings: Updating notificationTypes.messages to: false
🔧 NotificationSettings: Sending to backend: {messageNotifications: false, ...}
✅ NotificationSettings: Settings saved successfully
```

**Backend (check terminal/server logs):**
```
🔔 Emitting WebSocket event: notification-settings:updated to userId: fa5f790d-96d8-4033-8e12-393875c990eb
✅ WebSocket event emitted successfully: notification-settings:updated
```

**Frontend (useGlobalNotifications hook):**
```
🔔 WebSocket event received: notification-settings:updated {...}
🔔 Reloading notification settings from API...
🔄 loadSettings() called - fetching from API...
🔔 Loaded notification settings from API: {messageNotifications: false, ...}
🔔 Setting state with new settings...
✅ State update called with: {messageNotifications: false, ...}
```

**Frontend (State change detection):**
```
🔄 notificationSettings STATE CHANGED TO: {messageNotifications: false, ...}
```

**Frontend (useEffect re-run):**
```
🔔 Global notifications handler cleaned up
🔔 Global notifications handler initialized
🔔 Current notification settings in effect: {messageNotifications: false, ...}
```

### Step 3: Identify Missing Logs

**If you see:**
- ✅ "Settings saved successfully" but NO "WebSocket event received"
  - **Problem:** WebSocket event not reaching frontend
  - **Check:** Backend logs for emission
  - **Check:** WebSocket connection in Network tab

**If you see:**
- ✅ "WebSocket event received" but NO "loadSettings() called"
  - **Problem:** WebSocket listener not calling loadSettings
  - **Check:** Hard refresh browser to reload code

**If you see:**
- ✅ "loadSettings() called" but NO "State update called with"
  - **Problem:** API request failing
  - **Check:** Network tab for API response
  - **Check:** Console for error logs

**If you see:**
- ✅ "State update called" but NO "STATE CHANGED TO"
  - **Problem:** React state not updating (state object is same reference)
  - **This is the bug!**

**If you see:**
- ✅ "STATE CHANGED TO" but NO "handler initialized"
  - **Problem:** useEffect not re-running despite dependency change
  - **This is also a bug!**

## Common Issues

### Issue 1: WebSocket Not Connected

**Symptoms:**
- No WebSocket event received
- Backend shows emission but frontend doesn't log it

**Fix:**
1. Refresh page (F5)
2. Check socketService is initialized
3. Look for WebSocket connection errors in console

### Issue 2: Socket.io Namespace Mismatch

**Symptoms:**
- WebSocket connected
- Backend emits event
- Frontend never receives it

**Possible Cause:**
- Backend emitting to wrong namespace
- Frontend listening on wrong namespace

**Check:**
```javascript
// In browser console
window.socketService
// Should show socket object with connected: true
```

### Issue 3: Event Name Mismatch

**Backend emits:** `notification-settings:updated`
**Frontend listens for:** `notification-settings:updated`

Both must match exactly (case-sensitive, including colons and hyphens).

### Issue 4: Room/User Targeting

The backend uses `broadcastToUser(userId, event, data)`.

**Check:** Backend log shows correct userId matches Alice's ID:
```
🔔 Emitting WebSocket event: notification-settings:updated to userId: fa5f790d-96d8-4033-8e12-393875c990eb
```

### Issue 5: React State Not Triggering Re-render

If state update is called but useEffect doesn't re-run:

**Possible Cause:**
- State object reference hasn't changed
- React thinks it's the same object

**Check:**
```javascript
// In loadSettings function - we already do this correctly:
const newSettings = response.data.data.settings;
setNotificationSettings(newSettings);  // New object reference
```

## Manual WebSocket Test

You can manually test the WebSocket connection in browser console:

```javascript
// Check if socket is connected
window.socketService?.socket?.connected  // Should be true

// Manually trigger event (simulating backend emission)
window.socketService?.socket?.emit('notification-settings:updated', {
  settings: { messageNotifications: false },
  updatedBy: 'test'
})
```

After running this, you should see:
```
🔔 WebSocket event received: notification-settings:updated {...}
🔔 Reloading notification settings from API...
```

If you DO see these logs, then:
- ✅ WebSocket connection is working
- ✅ Event listener is registered
- ❌ Backend is not actually emitting the event

If you DON'T see these logs, then:
- ❌ WebSocket listener not registered properly
- ❌ Event name mismatch

## Quick Test Commands

```bash
# Check backend logs for WebSocket emission
# Look for these lines after toggling in UI:
🔔 Emitting WebSocket event: notification-settings:updated
✅ WebSocket event emitted successfully

# If you don't see these lines:
# - Backend code didn't run
# - PUT request failed
# - Check Network tab for /api/notification-settings PUT request
```

## Next Steps Based on Findings

### If WebSocket Event NOT Received:
1. Check `broadcastToUser` implementation in websocket.js
2. Verify Alice's socket is in the correct room
3. Check socket authentication

### If State NOT Updated:
1. Verify API response structure
2. Check if response.data.data.settings exists
3. Add error handling for API call

### If useEffect NOT Re-running:
1. This shouldn't happen with proper dependency array
2. Check React version compatibility
3. Try using useCallback for loadSettings
