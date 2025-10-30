# Session 7 UI Component Testing Guide

**Date**: October 24, 2025  
**Test Environment**: http://localhost:3001  
**Components to Test**: EmptyState, SkeletonLoaders, ErrorBoundary, Keyboard Shortcuts, Dark Mode

---

## Manual Test Execution Checklist

### Test Suite 1: Empty States (10 minutes)

#### TC-UI-001: Index Page - No Active Chat
**Steps:**
1. Open http://localhost:3001
2. Login with valid credentials
3. Do NOT click on any chat

**Expected Result:**
- ✅ EmptyState component visible in main area
- ✅ MessageSquare icon displayed
- ✅ Title: "Select a chat to start messaging"
- ✅ Description: "Choose a conversation from the sidebar to begin chatting"
- ✅ Component centered vertically and horizontally

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-002: ChatView - No Messages
**Steps:**
1. Click on a chat with no messages
2. Or create a new chat with no history

**Expected Result:**
- ✅ EmptyState component visible
- ✅ MessageSquare icon displayed
- ✅ Title: "No messages yet"
- ✅ Description: "Start the conversation..."
- ✅ Input field still accessible at bottom

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-003: CallHistory - No Calls
**Steps:**
1. Navigate to Call History
2. Ensure no call history exists

**Expected Result:**
- ✅ EmptyState component visible
- ✅ Phone icon displayed
- ✅ Title: "No calls yet"
- ✅ Helpful description displayed

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-004: CallHistory - Search No Results
**Steps:**
1. Navigate to Call History (with some calls)
2. Enter search query that matches nothing

**Expected Result:**
- ✅ EmptyState component visible
- ✅ Search icon displayed
- ✅ Title: "No calls match your filters"
- ✅ Clear/helpful message

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-005: BlockedContacts - No Blocked Users
**Steps:**
1. Navigate to Settings → Blocked Contacts
2. Ensure no users are blocked

**Expected Result:**
- ✅ EmptyState component visible
- ✅ ShieldOff icon displayed
- ✅ Title: "No blocked contacts"
- ✅ Description explains blocking feature

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-006: NotificationCenter - No Notifications
**Steps:**
1. Open Notification Center
2. Ensure no notifications exist

**Expected Result:**
- ✅ EmptyState component visible
- ✅ Bell icon displayed
- ✅ Title: "No new notifications"
- ✅ Professional appearance

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

### Test Suite 2: Skeleton Loaders (5 minutes)

#### TC-UI-007: ChatList Loading
**Steps:**
1. Open app (or hard refresh with Ctrl+Shift+R)
2. Observe chat list area while loading

**Expected Result:**
- ✅ ChatListSkeleton displays 8 skeleton items
- ✅ Each has circular avatar skeleton
- ✅ Each has rectangular text skeletons (name + preview)
- ✅ No flash of empty state
- ✅ Smooth transition to actual content

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-008: Messages Loading
**Steps:**
1. Click on a chat
2. Observe message area while loading
3. (You can simulate slow loading by throttling network in DevTools)

**Expected Result:**
- ✅ MessageSkeleton displays 6 skeleton messages
- ✅ Alternating sent/received layout
- ✅ Varying widths (64, 48, 56 in pattern)
- ✅ Includes avatar and timestamp skeletons
- ✅ Smooth transition to actual messages

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-009: CallHistory Loading
**Steps:**
1. Navigate to Call History
2. Observe while loading

**Expected Result:**
- ✅ CallHistorySkeleton displays 5 items
- ✅ Each has appropriate structure matching real call items
- ✅ Smooth loading animation (pulse effect)

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

### Test Suite 3: Keyboard Shortcuts (10 minutes)

#### TC-UI-010: Alt+1-9 Chat Switching
**Steps:**
1. Have at least 3 chats in your chat list
2. Press Alt+1 (switch to first chat)
3. Press Alt+2 (switch to second chat)
4. Press Alt+3 (switch to third chat)
5. Press Alt+9 (no 9th chat exists)

**Expected Result:**
- ✅ Alt+1: First chat opens
- ✅ Alt+2: Second chat opens
- ✅ Alt+3: Third chat opens
- ✅ Alt+9: No error, nothing happens (graceful)
- ✅ Shortcuts work from any page

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-011: Ctrl+Shift+S Settings Navigation
**Steps:**
1. From main chat page, press Ctrl+Shift+S
2. Verify navigation to settings

**Expected Result:**
- ✅ Navigates to /settings page
- ✅ Settings page loads correctly

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-012: Escape to Close Chat
**Steps:**
1. Open a chat
2. Press Escape key
3. Try Escape when no chat is open

**Expected Result:**
- ✅ With chat open: Chat closes, returns to empty state
- ✅ Without chat: No error, nothing happens
- ✅ Smooth transition

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-013: Enter to Send Message
**Steps:**
1. Open a chat
2. Type a message
3. Press Enter (without Shift)
4. Type another message
5. Press Shift+Enter

**Expected Result:**
- ✅ Enter: Message sends immediately
- ✅ Shift+Enter: Adds new line, does NOT send
- ✅ Input field clears after sending

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-014: Shift+? Help Modal
**Steps:**
1. From any page, press Shift+? (question mark)
2. Review modal contents
3. Press Escape or click outside to close

**Expected Result:**
- ✅ Help modal opens
- ✅ All shortcuts listed and categorized
- ✅ Keyboard badges formatted correctly (Ctrl+K style)
- ✅ Modal closes on Escape
- ✅ Modal closes on outside click

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-015: Shortcuts Don't Fire in Input Fields
**Steps:**
1. Click in message input field
2. Type text containing Alt+1 or Ctrl+K
3. Verify shortcuts don't trigger

**Expected Result:**
- ✅ Shortcuts DO NOT trigger when typing in input
- ✅ Text is entered normally
- ✅ Exception: Enter and Escape should still work

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

### Test Suite 4: Dark Mode (15 minutes)

#### TC-UI-016: Theme Toggle
**Steps:**
1. Look for theme toggle (check ChatList header or Settings)
2. Toggle to Dark mode
3. Toggle to Light mode
4. Toggle to System mode

**Expected Result:**
- ✅ Theme toggle accessible
- ✅ Dark mode: Background dark, text light
- ✅ Light mode: Background light, text dark
- ✅ System: Follows OS preference
- ✅ Theme persists after refresh

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-017: EmptyState Dark Mode
**Steps:**
1. Switch to Dark mode
2. Navigate to pages with EmptyState:
   - Index (no chat)
   - ChatView (no messages)
   - CallHistory (no calls)
   - BlockedContacts (no blocked)

**Expected Result:**
- ✅ Icon background darker (muted/30 opacity)
- ✅ Title text visible (high contrast)
- ✅ Description text visible (medium contrast)
- ✅ Icons properly colored
- ✅ No harsh white backgrounds

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-018: SkeletonLoaders Dark Mode
**Steps:**
1. Switch to Dark mode
2. Trigger skeleton loaders:
   - Refresh chat list
   - Load messages
   - Navigate to Call History

**Expected Result:**
- ✅ Skeletons visible but subtle
- ✅ Not too bright/harsh
- ✅ Smooth pulse animation
- ✅ Matches dark theme aesthetics

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-019: ErrorBoundary Dark Mode
**Steps:**
1. Switch to Dark mode
2. Trigger an error (if possible, or check with DevTools)
3. Observe error UI

**Expected Result:**
- ✅ Error page background matches dark theme
- ✅ Error card properly styled
- ✅ AlertTriangle icon visible
- ✅ Text readable with good contrast
- ✅ Buttons properly styled

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-020: ReconnectingIndicator Dark Mode
**Steps:**
1. Switch to Dark mode
2. Stop backend server to trigger disconnection
3. Observe reconnecting indicator

**Expected Result:**
- ✅ Yellow banner visible in dark mode
- ✅ Text color adjusted (dark:text-yellow-400)
- ✅ Good contrast and readability
- ✅ Icon visible

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

#### TC-UI-021: KeyboardShortcutsHelp Dark Mode
**Steps:**
1. Switch to Dark mode
2. Press Shift+? to open help modal
3. Review all elements

**Expected Result:**
- ✅ Modal overlay darkens appropriately
- ✅ Modal content background dark
- ✅ Text visible with good contrast
- ✅ Keyboard badges properly styled
- ✅ Separators visible but subtle
- ✅ Close button visible

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

### Test Suite 5: WCAG Contrast (10 minutes)

#### TC-UI-022: Contrast Ratios
**Steps:**
1. Open Chrome DevTools
2. Go to Elements tab
3. Use Lighthouse or accessibility tools
4. Check contrast ratios for key text elements

**Target Ratios (WCAG AA):**
- Normal text: ≥4.5:1
- Large text: ≥3:1

**Elements to Check:**
- EmptyState titles (should be ≥4.5:1)
- EmptyState descriptions (should be ≥4.5:1)
- Button text (should be ≥4.5:1)
- Message text (should be ≥4.5:1)

**Expected Result:**
- ✅ All text passes WCAG AA standards
- ✅ No contrast warnings in DevTools

**Actual Result:** [ ]  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

---

## Test Results Summary

**Executed:** ___ / 22  
**Passed:** ___ / 22  
**Failed:** ___ / 22  
**Pass Rate:** ____%

---

## Defects Found

| ID | Test Case | Severity | Description | Status |
|----|-----------|----------|-------------|--------|
| 1  |           |          |             |        |
| 2  |           |          |             |        |
| 3  |           |          |             |        |

---

## Tester Sign-off

**Tested By:** _______________  
**Date:** _______________  
**Environment:** http://localhost:3001  
**Browser:** _______________  
**OS:** Windows  

**Notes:**  
_______________  
_______________  
_______________

---

## Next Steps

- [ ] Fix any defects found
- [ ] Retest failed test cases
- [ ] Document any new findings
- [ ] Update test cases if needed

