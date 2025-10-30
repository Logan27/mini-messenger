# URL-Based Chat Routing Implementation

**Date:** October 27, 2025
**Feature:** Make chats accessible via specific URLs that persist on page reload

---

## Overview

Previously, chat selection was managed via React state (`useState`), which meant:
- ❌ Refreshing the page would lose the active chat
- ❌ Cannot share direct links to specific conversations
- ❌ Browser back/forward buttons didn't work for chat navigation
- ❌ No browser history for chat switches

Now with URL-based routing:
- ✅ Each chat has a unique URL: `/chat/:chatId`
- ✅ Reloading the page keeps the same chat open
- ✅ Can share direct links to conversations
- ✅ Browser back/forward buttons work
- ✅ Chat history tracked in browser

---

## URL Structure

| URL Pattern | Description | Example |
|------------|-------------|---------|
| `/` | Home page - chat list, no active chat | `http://localhost:3000/` |
| `/chat/:chatId` | Specific chat conversation | `http://localhost:3000/chat/abc-123-def` |

---

## Changes Made

### 1. App.tsx - Added Chat Route

**File:** `frontend/src/App.tsx`

```typescript
// Added new route for chat with ID parameter
<Route
  path="/chat/:chatId"
  element={
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  }
/>
```

**Both routes now render the same `Index` component:**
- `/` - Shows chat list without active chat
- `/chat/:chatId` - Shows chat list with specific chat active

---

### 2. Index.tsx - URL Parameter Integration

**File:** `frontend/src/pages/Index.tsx`

#### Before:
```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const navigate = useNavigate();

  // ...

  <ChatList
    chats={chats}
    activeChat={activeChat}
    onChatSelect={setActiveChat}  // Direct state update
  />
}
```

#### After:
```typescript
import { useNavigate, useParams } from "react-router-dom";

const Index = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChat = chatId || null;  // Read from URL
  const navigate = useNavigate();

  const handleChatSelect = (chatId: string) => {
    navigate(`/chat/${chatId}`);  // Navigate to URL
  };

  <ChatList
    chats={chats}
    activeChat={activeChat}
    onChatSelect={handleChatSelect}  // URL navigation
  />
}
```

**Key Changes:**
1. ✅ Removed `useState` for `activeChat`
2. ✅ Added `useParams()` to read `chatId` from URL
3. ✅ Created `handleChatSelect()` to navigate to chat URL
4. ✅ Updated keyboard shortcuts to use URL navigation

---

### 3. Keyboard Shortcuts Updated

**Shortcuts now navigate to URLs:**

```typescript
// Alt+1-9: Switch between chats
action: () => {
  if (chats[i]) {
    navigate(`/chat/${chats[i].id}`);  // Was: setActiveChat(chats[i].id)
  }
}

// Escape: Close active chat
action: () => {
  if (activeChat) {
    navigate('/');  // Was: setActiveChat(null)
  }
}
```

---

## How It Works

### Opening a Chat

**User Action:** Click on contact in chat list

**Flow:**
```
ChatList onClick
    ↓
onChatSelect(chatId) called
    ↓
handleChatSelect(chatId) in Index.tsx
    ↓
navigate(`/chat/${chatId}`)
    ↓
React Router updates URL
    ↓
Index component re-renders
    ↓
useParams() extracts chatId from URL
    ↓
activeChat = chatId
    ↓
ChatView renders for that chat
```

### Page Reload

**User Action:** Press F5 or reload page

**Flow:**
```
Browser reloads
    ↓
React Router parses URL: /chat/abc-123
    ↓
Index component renders
    ↓
useParams() extracts chatId: "abc-123"
    ↓
activeChat = "abc-123"
    ↓
useMessages({ recipientId: "abc-123" })
    ↓
Messages fetched for that chat
    ↓
ChatView displays same conversation
```

### Browser Back Button

**User Action:** Click browser back button

**Flow:**
```
User on: /chat/user-2
    ↓
Clicks back button
    ↓
Browser navigates to previous URL: /chat/user-1
    ↓
React Router updates params
    ↓
useParams() returns new chatId: "user-1"
    ↓
ChatView switches to user-1 conversation
```

---

## Benefits

### 1. **Persistence**
- Reloading page keeps chat open
- Users don't lose their place

### 2. **Shareable Links**
- Copy URL: `http://localhost:3000/chat/abc-123`
- Share with team members
- Direct link to specific conversation

### 3. **Browser History**
- Back/forward buttons work
- Chat navigation tracked in history
- Natural web app behavior

### 4. **Bookmarking**
- Can bookmark specific conversations
- Quick access to frequent chats

### 5. **Deep Linking**
- Can link from external apps/emails
- Jump directly to conversation

---

## Testing

### Test Case 1: URL Persistence on Reload

**Steps:**
1. Open messenger at `http://localhost:3000/`
2. Click on a contact to open chat
3. URL changes to `http://localhost:3000/chat/{userId}`
4. Press F5 to reload
5. ✅ **Expected:** Same chat remains open

### Test Case 2: Direct URL Access

**Steps:**
1. Get chat URL from address bar: `http://localhost:3000/chat/user-123`
2. Open new browser tab
3. Paste URL and press Enter
4. ✅ **Expected:** Chat opens directly

### Test Case 3: Browser Navigation

**Steps:**
1. Open Chat A (URL: `/chat/userA`)
2. Open Chat B (URL: `/chat/userB`)
3. Click browser back button
4. ✅ **Expected:** Returns to Chat A

### Test Case 4: Keyboard Shortcuts

**Steps:**
1. Press `Alt+1` to open first chat
2. URL updates to `/chat/{firstChatId}`
3. Press `Escape`
4. URL updates to `/`
5. ✅ **Expected:** URL and chat state stay in sync

### Test Case 5: Invalid Chat ID

**Steps:**
1. Navigate to `/chat/invalid-id-123`
2. ✅ **Expected:** Shows empty state or error (existing error handling)

---

## Implementation Notes

### Why Both Routes Use Same Component?

```typescript
<Route path="/" element={<Index />} />
<Route path="/chat/:chatId" element={<Index />} />
```

**Benefits:**
- Single component handles both states
- Less code duplication
- Natural transition between no-chat and active-chat
- Sidebar always visible

**Alternative Approach (Not Used):**
Could have nested routes, but current approach is simpler:
```typescript
<Route path="/" element={<Layout />}>
  <Route index element={<EmptyState />} />
  <Route path="chat/:chatId" element={<ChatView />} />
</Route>
```

### State Management

**Before:** React State
```typescript
const [activeChat, setActiveChat] = useState(null);
```

**After:** URL as Source of Truth
```typescript
const { chatId } = useParams();
const activeChat = chatId || null;
```

**Why URL is better:**
- URL = Single source of truth
- No state synchronization needed
- Browser handles history automatically
- Works with refresh/bookmarks

---

## Future Enhancements

### 1. Group Chat URLs
Add support for group chats:
```typescript
<Route path="/group/:groupId" element={<Index />} />
```

### 2. Query Parameters
Add filters/search to URL:
```typescript
/chat/user-123?search=hello&filter=media
```

### 3. Multiple Chat Windows
Open multiple chats in separate tabs:
```typescript
window.open(`/chat/${userId}`, '_blank');
```

### 4. Chat State in URL
Store scroll position, draft message:
```typescript
/chat/user-123?scroll=bottom&draft=hello%20there
```

---

## Troubleshooting

### Issue: Chat doesn't open on page load

**Possible Causes:**
1. Invalid chat ID in URL
2. User doesn't have permission to view chat
3. Contact not in user's contact list

**Solution:** Check browser console for errors and verify user has access to chat

### Issue: URL updates but chat doesn't change

**Possible Causes:**
1. useParams() not extracting chatId correctly
2. activeChat not updating

**Solution:** Check React DevTools to verify useParams() returns correct value

### Issue: Browser back button doesn't work

**Possible Causes:**
1. Using `navigate()` with `replace: true` option
2. Preventing default browser behavior

**Solution:** Ensure all `navigate()` calls push to history (default behavior)

---

## Files Modified

1. ✅ `frontend/src/App.tsx` - Added `/chat/:chatId` route
2. ✅ `frontend/src/pages/Index.tsx` - Replaced useState with useParams, added URL navigation

---

**Status:** ✅ COMPLETE - Chats now use URL-based routing with full persistence
