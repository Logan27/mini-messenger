# 📊 Contact List Feature - Visual Overview

## 🎨 UI Layout

### Main ChatList View with Tabs

```
┌─────────────────────────────────────────────────┐
│  Messages                    [🔍][🌙][🔔][👥][➕][⚙️]│
├─────────────────────────────────────────────────┤
│  ┌──────────────┬──────────────┐               │
│  │   💬 Chats   │  👤 Contacts │               │
│  └──────────────┴──────────────┘               │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔍 Search contacts...                    │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────┬─────┬────────┐                        │
│  │ All │Online│Offline│                        │
│  └─────┴─────┴────────┘                        │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ [🖼️]  Alice Johnson        [💬][📞][📹][⋮]│   │
│  │   •   Online                             │   │
│  │       @alice_j                           │   │
│  ├─────────────────────────────────────────┤   │
│  │ [🖼️]  Bob Smith           [💬][📞][📹][⋮]│   │
│  │   •   Online                             │   │
│  │       @bobsmith                          │   │
│  ├─────────────────────────────────────────┤   │
│  │ [🖼️]  Charlie Brown       [💬][📞][📹][⋮]│   │
│  │   🕐  5m ago                             │   │
│  │       @charlie                           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 🎯 Contact Item States

### 1. Online Contact
```
┌──────────────────────────────────────────┐
│ [Avatar]  Full Name         [Actions]    │
│    •      Online                         │
│           @username                      │
└──────────────────────────────────────────┘
```
- **Green dot** on avatar
- **"Online"** text in green
- Username below name

### 2. Offline Contact (Recent)
```
┌──────────────────────────────────────────┐
│ [Avatar]  Full Name         [Actions]    │
│    🕐     5m ago                         │
│           @username                      │
└──────────────────────────────────────────┘
```
- **Clock icon** with last seen
- Gray text for timestamp
- Username below name

### 3. Blocked Contact
```
┌──────────────────────────────────────────┐
│ [Avatar]  Full Name  [🔴Blocked][Actions]│
│    🕐     Yesterday                      │
│           @username                      │
└──────────────────────────────────────────┘
```
- **Red "Blocked" badge**
- Still shows last seen
- Actions menu has "Unblock" option

### 4. Muted Contact
```
┌──────────────────────────────────────────┐
│ [Avatar]  Full Name   [Muted]  [Actions] │
│    •      Online                         │
│           @username                      │
└──────────────────────────────────────────┘
```
- **Gray "Muted" badge**
- **60% opacity** on entire item
- Actions menu has unmute option

## 🎬 Interactions

### Hover State
```
On hover, action buttons fade in:
┌──────────────────────────────────────────┐
│ [Avatar]  Full Name   [💬][📞][📹][⋮]    │
│    •      Online                         │
│           @username                      │
└──────────────────────────────────────────┘
```

### Click Actions
- **Avatar/Name Area**: Select contact (show profile?)
- **💬 Message**: Start chat, switch to Chats tab
- **📞 Phone**: Start voice call (coming soon toast)
- **📹 Video**: Start video call (coming soon toast)
- **⋮ More**: Opens dropdown menu

## 📋 More Menu Options

```
┌─────────────────────────┐
│ 💬 Send Message         │
│ 📞 Voice Call           │
│ 📹 Video Call           │
├─────────────────────────┤
│ 🚫 Block/Unblock        │
│ ❌ Remove Contact       │
└─────────────────────────┘
```

## 🔍 Search & Filter

### Search Active
```
┌─────────────────────────────────────────┐
│ 🔍 ali                                   │
└─────────────────────────────────────────┘

Showing 2 results:
- Alice Johnson
- Alicia Keys
```

### No Results
```
┌─────────────────────────────────────────┐
│        No contacts found matching       │
│               "xyz123"                  │
└─────────────────────────────────────────┘
```

## 📊 Tab States

### All Tab (Default)
- Shows all contacts (online first, then offline)
- Badge: `All (15)`

### Online Tab
- Shows only online contacts
- Badge: `Online (5)`
- Empty state: "No contacts are currently online"

### Offline Tab
- Shows only offline contacts
- Badge: `Offline (10)`
- Empty state: "No offline contacts"

## ⚠️ Confirmation Dialogs

### Remove Contact
```
┌─────────────────────────────────────────┐
│  Remove Contact                         │
│                                         │
│  Are you sure you want to remove        │
│  Alice Johnson from your contacts?      │
│  You can always add them back later.    │
│                                         │
│          [Cancel]  [Remove]             │
└─────────────────────────────────────────┘
```

### Block Contact
```
┌─────────────────────────────────────────┐
│  Block Contact                          │
│                                         │
│  Are you sure you want to block         │
│  Bob Smith? They won't be able to       │
│  send you messages or call you.         │
│                                         │
│          [Cancel]  [Block]              │
└─────────────────────────────────────────┘
```

### Unblock Contact
```
┌─────────────────────────────────────────┐
│  Unblock Contact                        │
│                                         │
│  Are you sure you want to unblock       │
│  Charlie Brown? They will be able to    │
│  send you messages again.               │
│                                         │
│          [Cancel]  [Unblock]            │
└─────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Light Mode
- **Online dot**: `bg-green-500`
- **Online text**: `text-green-600`
- **Blocked badge**: `bg-destructive` (red)
- **Muted badge**: `bg-secondary` (gray)
- **Hover background**: `bg-accent`
- **Text**: `text-foreground`
- **Muted text**: `text-muted-foreground`

### Dark Mode
- Same classes, adjusted by Tailwind's dark mode
- Consistent theming across all states

## 📱 Responsive Behavior

### Desktop (1024px+)
```
┌──────────────────┬────────────────────────┐
│  Contact List    │   Chat View            │
│  (320-384px)     │   (Flexible width)     │
│                  │                        │
│  [Contacts...]   │   [Messages...]        │
└──────────────────┴────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌──────────────────┬────────────────────┐
│  Contact List    │   Chat View        │
│  (320px)         │   (Flexible)       │
└──────────────────┴────────────────────┘
```

### Mobile (<768px)
```
Full-width contact list or chat view
Tab switching behavior
```

## 🔄 State Transitions

### Starting a Chat
```
1. User clicks contact or 💬 button
2. setActiveTab('chats') - switch to Chats tab
3. onChatSelect(contactId) - open chat
4. ChatView loads with selected contact
```

### Creating a Group
```
1. User creates group from CreateGroupDialog
2. handleGroupCreated(groupId) called
3. setActiveTab('chats') - switch to Chats tab
4. onChatSelect(groupId) - open group chat
```

### Removing a Contact
```
1. User clicks "Remove Contact" from menu
2. Confirmation dialog opens
3. User confirms
4. API DELETE request
5. Toast notification
6. Contact list refreshes (refetchContacts)
7. Contact removed from view
```

## 📈 Performance Features

### Memoization
```typescript
useMemo(() => {
  // Filter by search
  // Sort alphabetically
  // Split online/offline
  // Apply tab filter
}, [contacts, searchQuery, activeTab])
```

### Scroll Optimization
- ScrollArea component with smooth scrolling
- Virtual scrolling ready (react-window support)
- Efficient re-renders with React.memo (future)

## 🎯 Key Features Summary

✅ **Alphabetical Sorting**: A-Z by display name  
✅ **Online Status**: Green dot + "Online" text  
✅ **Last Seen**: Formatted timestamps (5m ago, Yesterday, etc.)  
✅ **Three Tabs**: All/Online/Offline with counts  
✅ **Search**: Real-time filtering  
✅ **Quick Actions**: Message, Call, Video  
✅ **More Menu**: Block, Remove  
✅ **Badges**: Blocked, Muted  
✅ **Confirmations**: All destructive actions  
✅ **Toast Feedback**: Success and error messages  
✅ **Responsive**: Mobile, tablet, desktop  
✅ **Dark Mode**: Full support  
✅ **Empty States**: Helpful messages  
✅ **Loading States**: During API calls  

---

*Visual guide for Contact List feature implementation*
