# Chrome-DevTools Test Plan - From Scratch

**Issue:** Chrome-devtools session stuck with "browser is already running" error

---

## Problem Diagnosis

Chrome-devtools MCP is stuck on an existing session. The browser profile is locked:
`C:\Users\anton\.cache\chrome-devtools-mcp\chrome-profile`

---

## Solutions

### Option 1: Restart Chrome-DevTools Server
The chrome-devtools MCP server needs to be restarted to clear the stuck session.

### Option 2: Close Browser and Retry
Close any existing Chrome/Chromium instances and retry the connection.

### Option 3: Use Isolated Mode
Start chrome-devtools with `--isolated` flag to avoid session conflicts.

---

## What Needs to Be Tested

Once chrome-devtools reconnects, test these scenarios:

### 1. Login Test
- URL: http://localhost:3000/login
- Test user: charlie
- Password: Admin123!@#
- Expected: Successful login

### 2. BUG-001: Dashboard Test
- URL: http://localhost:3000/admin
- Check if dashboard loads
- Expected: Statistics displayed or error logged

### 3. BUG-002: Pending Users Test  
- URL: http://localhost:3000/admin/pending-users
- Check if list loads
- Expected: List of pending users displays

### 4. Messaging Test
- Login as charlie
- Try to add contact (alice, bob, etc.)
- Test sending messages

### 5. Logout Test
- Test logout via hamburger menu
- Expected: Redirect to login

---

## Current Status

**App:** Running on http://localhost:3000  
**Chrome-DevTools:** Connection issue (stuck session)  
**Action Needed:** Restart chrome-devtools MCP or clear browser session
