# Notification Toggle Fix - Testing Instructions

## IMPORTANT: Hard Refresh Required!

**The frontend code has been updated. You MUST hard-refresh the browser to see the changes:**

### How to Hard Refresh:
- **Windows:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`
- **Alternative:** Open DevTools (F12) → Right-click the refresh button → "Empty Cache and Hard Reload"

## Changes Made

### Files Modified:

1. **frontend/src/hooks/useGlobalNotifications.ts**
   - Fixed all boolean checks to use strict equality (`=== false`, `=== true`)
   - Added call notification handler
   - Added time normalization for quiet hours
   - Added detailed console logging

2. **frontend/src/components/IncomingCall.tsx**
   - Fixed boolean checks to use strict equality
   - Added time normalization for quiet hours
   - Added detailed console logging

3. **frontend/src/components/NotificationSettings.tsx**
   - Fixed settings loading path from `response.data.data` to `response.data.data.settings`
   - Added console logging for debugging

### Key Fixes:

**Before:**
```typescript
if (!settings.pushEnabled) { ... }          // Treats undefined as false
if (settings.doNotDisturb) { ... }          // Treats any truthy as true
```

**After:**
```typescript
if (settings.pushEnabled === false) { ... } // Only explicit false
if (settings.doNotDisturb === true) { ... } // Only explicit true
```

## Testing Steps

### 1. Hard Refresh Browser
Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### 2. Open Browser Console
Press `F12` → Go to "Console" tab

### 3. Check Current Settings
```sql
-- In database
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "SELECT \"inAppEnabled\", \"pushEnabled\", \"messageNotifications\", \"callNotifications\", \"doNotDisturb\" FROM \"notificationSettings\" WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"
```

Current state (as of last check):
- inAppEnabled: **true**
- pushEnabled: **true**
- messageNotifications: **false** ← DISABLED
- callNotifications: **true**
- doNotDisturb: **false**

### 4. Test Message Notifications (Should be BLOCKED)

**Setup:** `messageNotifications = false` (already set)

**Test:**
1. Have anton1 send a message to Alice
2. **Expected:** NO browser notification
3. **Check console logs for:**
   ```
   🔔 Checking notification settings: {...}
   🔔 messageNotifications value: false type: boolean
   🔇 Message notifications explicitly disabled in settings
   ```

### 5. Test Call Notifications (Should WORK)

**Setup:** `callNotifications = true` (already set)

**Test:**
1. Have anton1 call Alice
2. **Expected:** Browser notification SHOULD appear
3. **Check console logs for:**
   ```
   📞 IncomingCall: Checking notification settings: {...}
   ✅ IncomingCall: All checks passed, showing notification
   ```

### 6. Test Disabling Call Notifications

**Setup:**
```sql
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "UPDATE \"notificationSettings\" SET \"callNotifications\" = false WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"
```

**Test:**
1. Reload Alice's browser (Ctrl+R is fine, settings are reloaded on each check)
2. Have anton1 call Alice
3. **Expected:** NO browser notification
4. **Check console logs for:**
   ```
   📞 IncomingCall: Checking notification settings: {...}
   🔇 IncomingCall: Call notifications explicitly disabled
   ```

### 7. Test Global Notifications Toggle

**Setup:**
```sql
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "UPDATE \"notificationSettings\" SET \"inAppEnabled\" = false WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"
```

**Test:**
1. Reload Alice's browser
2. Have anton1 send message and call Alice
3. **Expected:** NO browser notifications for either
4. **Check console logs for:**
   ```
   🔇 Global in-app notifications disabled
   ```

### 8. Reset to All Enabled

**Setup:**
```sql
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "UPDATE \"notificationSettings\" SET \"inAppEnabled\" = true, \"pushEnabled\" = true, \"messageNotifications\" = true, \"callNotifications\" = true, \"doNotDisturb\" = false, \"quietHoursStart\" = NULL, \"quietHoursEnd\" = NULL WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"
```

**Test:**
1. Reload Alice's browser
2. Have anton1 send message
3. **Expected:** Browser notification appears
4. Have anton1 call Alice
5. **Expected:** Browser notification appears

## Troubleshooting

### Still Getting Notifications When Disabled?

**Check 1: Did you hard refresh?**
- Press `Ctrl + Shift + R` (not just F5!)
- Or close and reopen the browser tab completely

**Check 2: Check the console logs**
- Open DevTools (F12) → Console tab
- Look for these prefixes:
  - `🔔` - Settings check
  - `🔇` - Notification blocked
  - `✅` - Notification allowed
  - `📞 IncomingCall:` - Call notification check

**Check 3: Verify settings in database**
```sql
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "SELECT * FROM \"notificationSettings\" WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"
```

**Check 4: Verify API response**
- In browser console, type:
  ```javascript
  fetch('http://localhost:4000/api/notification-settings', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.json()).then(console.log)
  ```
- This will show exactly what the API is returning

### Not Getting Notifications When Enabled?

**Check 1: Browser permission**
- In console, type: `Notification.permission`
- Should return `"granted"`
- If `"denied"` or `"default"`, browser has blocked notifications
- Fix: Browser settings → Notifications → Allow for localhost

**Check 2: Check console for errors**
- Look for `❌` emoji in logs
- Could be network error loading settings

## Console Log Examples

### Message Blocked (messageNotifications = false):
```
🔔 Loaded notification settings: {messageNotifications: false, ...}
💬 Received message via socket: {id: '...', senderId: '...'}
🔔 Checking notification settings: {messageNotifications: false, ...}
🔔 messageNotifications value: false type: boolean
🔇 Message notifications explicitly disabled in settings
```

### Call Blocked (callNotifications = false):
```
📞 Received incoming call via socket: {call: {...}}
📞 IncomingCall: Checking notification settings: {callNotifications: false, ...}
🔇 IncomingCall: Call notifications explicitly disabled
```

### All Enabled (notification shown):
```
🔔 Loaded notification settings: {messageNotifications: true, callNotifications: true, ...}
💬 Received message via socket: {id: '...'}
🔔 Checking notification settings: {messageNotifications: true, ...}
🔔 messageNotifications value: true type: boolean
✅ Not in quiet hours - notification allowed
💬 New message from another user: {...}
🔔 Creating notification: {...}
✅ Notification created and event handlers attached
```

## Database Quick Commands

```bash
# View all settings
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "SELECT \"inAppEnabled\", \"pushEnabled\", \"messageNotifications\", \"callNotifications\", \"mentionNotifications\", \"doNotDisturb\", \"quietHoursStart\", \"quietHoursEnd\" FROM \"notificationSettings\" WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"

# Enable all
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "UPDATE \"notificationSettings\" SET \"inAppEnabled\" = true, \"pushEnabled\" = true, \"messageNotifications\" = true, \"callNotifications\" = true, \"doNotDisturb\" = false WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"

# Disable messages only
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "UPDATE \"notificationSettings\" SET \"messageNotifications\" = false WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"

# Disable calls only
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "UPDATE \"notificationSettings\" SET \"callNotifications\" = false WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"

# Enable Do Not Disturb
cd backend && docker-compose exec -T postgres psql -U messenger -d messenger -c "UPDATE \"notificationSettings\" SET \"doNotDisturb\" = true WHERE \"userId\" = 'fa5f790d-96d8-4033-8e12-393875c990eb';"
```
