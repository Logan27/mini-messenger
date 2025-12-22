# PWA, Notifications & Advanced Settings Test Cases

## TC-PWA-001: PWA & Offline Capabilities

### Test Scenario 1.1: Service Worker Installation & Caching
**Priority:** High
**Requirement:** PWA-001

**Test Steps:**
1. Load application in a supported browser (Chrome/Edge)
2. Open DevTools > Application > Service Workers
3. Verify Service Worker is registered and active
4. Check Cache Storage for static assets
5. Refresh page

**Expected Results:**
- Service Worker registered successfully
- Static assets (JS, CSS, Images) cached
- App loads instantly on refresh (served from cache)
- Network tab shows requests served from "ServiceWorker"

---

### Test Scenario 1.2: Offline Mode & Custom Offline Page
**Priority:** High
**Requirement:** PWA-002

**Test Steps:**
1. Load application
2. Set Network to "Offline" in DevTools (or disconnect internet)
3. Navigate to a new route (not previously visited) OR refresh page

**Expected Results:**
- Custom "You are offline" page displayed
- Gradient design with connection status indicator
- "Reconnect" button visible
- Auto-reloads when connection restored (simulate by going Online)

---

### Test Scenario 1.3: Offline Message Queuing
**Priority:** High
**Requirement:** PWA-003

**Test Steps:**
1. Go to a chat conversation
2. Disconnect from internet (Offline mode)
3. Type and send a message
4. Observe message status
5. Reconnect to internet

**Expected Results:**
- Message appears in chat immediately with "Pending/Queued" status
- Input field clears
- Toast notification: "You are offline. Message queued." (or similar)
- Upon reconnection: Message automatically sent
- Status changes to "Sent" -> "Delivered"

---

### Test Scenario 1.4: PWA Install Prompt
**Priority:** Medium
**Requirement:** PWA-004

**Preconditions:**
- App not yet installed
- Browser supports PWA (Chrome/Edge/Samsung Internet)

**Test Steps:**
1. Open application
2. Interact with the app (click around)
3. Observe UI for install prompt

**Expected Results:**
- Custom Install Prompt banner/button appears
- Clicking "Install" triggers native browser install dialog
- App installs to desktop/home screen
- App opens in standalone mode (no browser address bar)

---

## TC-NT-001: Advanced Notification Settings

### Test Scenario 2.1: Master Notification Toggle
**Priority:** High
**Requirement:** FR-NT-004

**Test Steps:**
1. Go to Settings > Notifications
2. Toggle "Enable Notifications" OFF
3. Receive a message from another user

**Expected Results:**
- No desktop notification
- No sound
- Settings persist after refresh

---

### Test Scenario 2.2: Quiet Hours Schedule
**Priority:** Medium
**Requirement:** FR-NT-004

**Test Steps:**
1. Go to Settings > Notifications
2. Enable "Quiet Hours"
3. Set Start Time to 1 minute ago
4. Set End Time to 1 hour from now
5. Receive a message

**Expected Results:**
- No sound played
- No desktop notification
- Message still appears in chat list (unread count increases)

---

### Test Scenario 2.3: Do Not Disturb (DND) Mode
**Priority:** High
**Requirement:** FR-NT-004

**Test Steps:**
1. Go to Settings > Notifications
2. Enable "Do Not Disturb" toggle
3. Receive a message or call

**Expected Results:**
- No sound
- No desktop notification
- DND overrides other settings
- Status indicator might show DND (red dot/moon icon)

---

### Test Scenario 2.4: Sound Settings & Volume
**Priority:** Low
**Requirement:** FR-NT-004

**Test Steps:**
1. Go to Settings > Notifications
2. Adjust Volume slider to 50%
3. Click "Test Sound" button
4. Change Notification Sound (if option exists)

**Expected Results:**
- Sound plays at selected volume
- Selected sound file plays
- Preference saved

---

### Test Scenario 2.5: Granular Notification Types
**Priority:** Medium
**Requirement:** FR-NT-004

**Test Steps:**
1. Go to Settings > Notifications
2. Disable "Group Messages" notifications
3. Keep "Direct Messages" enabled
4. Receive Group Message
5. Receive Direct Message

**Expected Results:**
- Group Message: No notification/sound
- Direct Message: Notification and sound play
- Granular control works as expected

---

## TC-SC-008: Advanced Session Management

### Test Scenario 3.1: View Active Sessions Details
**Priority:** Medium
**Requirement:** FR-SC-002

**Test Steps:**
1. Login on Device A (Desktop)
2. Login on Device B (Mobile/Simulated)
3. Go to Settings > Security > Active Sessions on Device A

**Expected Results:**
- List of all active sessions displayed
- Current session marked with badge
- Details shown for each:
  - Device Type (Desktop/Mobile/Tablet icon)
  - Browser & OS (e.g., Chrome on Windows)
  - IP Address
  - Location (City, Country)
  - Last Active timestamp

---

### Test Scenario 3.2: Revoke Specific Session
**Priority:** High
**Requirement:** FR-SC-002

**Test Steps:**
1. Identify session from Device B in the list
2. Click "Revoke" (trash icon) for Device B
3. Confirm action

**Expected Results:**
- Session removed from list
- Device B is logged out immediately (or upon next action)
- Success toast displayed

---

### Test Scenario 3.3: Revoke All Other Sessions
**Priority:** High
**Requirement:** FR-SC-002

**Preconditions:**
- Multiple active sessions exist

**Test Steps:**
1. Click "Revoke All Other Sessions" button
2. Confirm action

**Expected Results:**
- All sessions except current one removed
- All other devices logged out
- Success toast displayed

---
