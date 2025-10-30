# UI/UX Design Guidelines

**Version:** 1.0
**Last Updated:** 2025-01-17
**Design Reference:** Telegram Messenger
**Component Library:** shadcn/ui (Web), React Native Paper (Mobile)

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Design System](#design-system)
3. [Component Libraries](#component-libraries)
4. [Screen Layouts](#screen-layouts)
5. [Navigation Patterns](#navigation-patterns)
6. [Messaging UI Components](#messaging-ui-components)
7. [Animations & Transitions](#animations--transitions)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Implementation Examples](#implementation-examples)

---

## Design Philosophy

### Telegram-Inspired Principles

1. **Speed First**: Every interaction should feel instant
2. **Minimalist Clean**: Remove visual noise, focus on content
3. **Information Density**: Show more without cluttering
4. **Predictable Behavior**: Consistent patterns across all screens
5. **Smooth Animations**: 60fps transitions, no jank
6. **Power User Features**: Keyboard shortcuts, gestures, multi-select

### Core Values

- **Performance**: Sub-100ms interactions, optimistic UI updates
- **Simplicity**: Self-explanatory UI, minimal onboarding
- **Reliability**: Offline-first, handle errors gracefully
- **Privacy**: E2E encryption indicators, secret chat UI

---

## Design System

### Color Palette

#### Light Theme

```css
:root {
  /* Primary (Telegram Blue) */
  --primary: 207 100% 48%;           /* #0088cc */
  --primary-hover: 207 100% 42%;     /* #0077b3 */
  --primary-active: 207 100% 38%;    /* #006ba3 */

  /* Background */
  --background: 0 0% 100%;           /* #ffffff */
  --background-secondary: 0 0% 98%;  /* #fafafa */
  --chat-bg: 214 32% 91%;            /* #dfe5e9 */

  /* Text */
  --foreground: 0 0% 15%;            /* #262626 */
  --muted-foreground: 0 0% 45%;      /* #737373 */

  /* Message Bubbles */
  --bubble-out: 207 100% 48%;        /* #0088cc (outgoing) */
  --bubble-out-text: 0 0% 100%;      /* #ffffff */
  --bubble-in: 0 0% 100%;            /* #ffffff (incoming) */
  --bubble-in-text: 0 0% 15%;        /* #262626 */

  /* Status Colors */
  --success: 142 71% 45%;            /* #28a745 */
  --warning: 45 100% 51%;            /* #ffc107 */
  --error: 0 84% 60%;                /* #f44336 */
  --info: 199 89% 48%;               /* #0dcaf0 */

  /* Borders */
  --border: 0 0% 90%;                /* #e5e5e5 */
  --divider: 0 0% 93%;               /* #eeeeee */

  /* Online Indicator */
  --online: 142 71% 45%;             /* #28a745 */

  /* Unread Badge */
  --badge: 0 0% 60%;                 /* #999999 (muted) */
  --badge-important: 207 100% 48%;   /* #0088cc (important) */
}
```

#### Dark Theme

```css
:root[data-theme="dark"] {
  /* Primary */
  --primary: 207 100% 58%;           /* #5bb3e8 */
  --primary-hover: 207 100% 65%;     /* #78c4ed */
  --primary-active: 207 100% 70%;    /* #8fd0f1 */

  /* Background */
  --background: 216 28% 7%;          /* #0e1621 */
  --background-secondary: 215 27% 10%; /* #151e27 */
  --chat-bg: 215 26% 12%;            /* #182533 */

  /* Text */
  --foreground: 0 0% 95%;            /* #f2f2f2 */
  --muted-foreground: 0 0% 70%;      /* #b3b3b3 */

  /* Message Bubbles */
  --bubble-out: 207 100% 38%;        /* #2b5278 */
  --bubble-out-text: 0 0% 100%;      /* #ffffff */
  --bubble-in: 215 27% 17%;          /* #212e3a */
  --bubble-in-text: 0 0% 95%;        /* #f2f2f2 */

  /* Status Colors */
  --success: 142 71% 45%;            /* #28a745 */
  --warning: 45 100% 51%;            /* #ffc107 */
  --error: 0 84% 60%;                /* #f44336 */
  --info: 199 89% 48%;               /* #0dcaf0 */

  /* Borders */
  --border: 0 0% 20%;                /* #333333 */
  --divider: 0 0% 15%;               /* #262626 */

  /* Online Indicator */
  --online: 142 71% 45%;             /* #28a745 */

  /* Unread Badge */
  --badge: 0 0% 50%;                 /* #808080 (muted) */
  --badge-important: 207 100% 58%;   /* #5bb3e8 (important) */
}
```

### Typography

```css
/* Font Family */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono',
             Consolas, monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px - timestamps, metadata */
--text-sm: 0.875rem;   /* 14px - secondary text */
--text-base: 1rem;     /* 16px - body text, messages */
--text-lg: 1.125rem;   /* 18px - chat titles */
--text-xl: 1.25rem;    /* 20px - screen headers */
--text-2xl: 1.5rem;    /* 24px - large headers */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing Scale

```css
/* Spacing (8px base unit) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Border Radius

```css
--radius-sm: 4px;     /* Small elements (badges) */
--radius-md: 8px;     /* Cards, inputs */
--radius-lg: 12px;    /* Message bubbles, modals */
--radius-xl: 16px;    /* Large cards */
--radius-full: 9999px; /* Avatars, pills */
```

### Shadows

```css
/* Light Theme */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

/* Dark Theme */
--shadow-sm-dark: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-md-dark: 0 4px 6px -1px rgb(0 0 0 / 0.4);
--shadow-lg-dark: 0 10px 15px -3px rgb(0 0 0 / 0.5);
--shadow-xl-dark: 0 20px 25px -5px rgb(0 0 0 / 0.6);
```

### Z-Index Layers

```css
--z-base: 1;
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
```

---

## Component Libraries

### Web Application (React)

#### Primary: shadcn/ui

**Why shadcn/ui:**
- Copy-paste components (full ownership, no black box)
- Built on Radix UI primitives (accessibility, keyboard navigation)
- Tailwind CSS (utility-first, customizable)
- TypeScript-first
- Tree-shakeable (only import what you need)

**Installation:**

```bash
npx shadcn@latest init
```

**Core Components for Messenger:**

```bash
# Layout & Navigation
npx shadcn@latest add sidebar
npx shadcn@latest add scroll-area
npx shadcn@latest add resizable

# Forms & Inputs
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add checkbox
npx shadcn@latest add switch

# Data Display
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add card
npx shadcn@latest add separator

# Overlays
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add dropdown-menu
npx shadcn@latest add context-menu
npx shadcn@latest add popover
npx shadcn@latest add tooltip

# Feedback
npx shadcn@latest add sonner  # Toast notifications
npx shadcn@latest add progress
npx shadcn@latest add spinner
npx shadcn@latest add skeleton

# Misc
npx shadcn@latest add command  # Command palette (Ctrl+K)
npx shadcn@latest add tabs
```

#### Complementary Libraries

**Icons:**
```bash
npm install lucide-react
```

**Date/Time:**
```bash
npm install date-fns
```

**Emoji Picker:**
```bash
npm install emoji-picker-react
```

**File Upload:**
```bash
npm install react-dropzone
```

**Media Player:**
```bash
npm install react-player
```

**Image Viewer:**
```bash
npm install yet-another-react-lightbox
```

**Virtualization (Long Lists):**
```bash
npm install @tanstack/react-virtual
```

### Mobile Application (React Native)

#### Primary: React Native Paper

**Why React Native Paper:**
- Material Design 3 (modern, polished)
- Extensive component library
- Theming support (light/dark)
- Accessibility built-in
- Active maintenance

**Installation:**

```bash
npm install react-native-paper
npm install react-native-vector-icons
npm install react-native-safe-area-context
```

**Core Components:**

```typescript
// Layout
import { Surface, Divider } from 'react-native-paper';

// Inputs
import { TextInput, Button, Checkbox, Switch, RadioButton } from 'react-native-paper';

// Display
import { Avatar, Badge, Card, Chip, List } from 'react-native-paper';

// Feedback
import { Snackbar, ProgressBar, ActivityIndicator } from 'react-native-paper';

// Navigation
import { Appbar, BottomNavigation, Drawer } from 'react-native-paper';

// Overlays
import { Dialog, Menu, Portal, Modal } from 'react-native-paper';
```

#### Complementary Libraries

**Icons:**
```bash
npm install @expo/vector-icons
```

**Navigation:**
```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
```

**Gestures:**
```bash
npm install react-native-gesture-handler react-native-reanimated
```

**Image Picker:**
```bash
npm install expo-image-picker
```

**Camera:**
```bash
npm install expo-camera
```

**Audio:**
```bash
npm install expo-av
```

**Haptics:**
```bash
npm install expo-haptics
```

**Permissions:**
```bash
npm install expo-permissions
```

---

## Screen Layouts

### Web Application Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header (60px)                                          │
│  [Logo] [Search] [User Menu]                            │
├────────────┬────────────────┬───────────────────────────┤
│            │                │                           │
│  Sidebar   │  Chat List     │  Chat View                │
│  (280px)   │  (320-400px)   │  (Flexible)               │
│            │                │                           │
│  [Chats]   │  ┌──────────┐  │  ┌─────────────────────┐ │
│  [Calls]   │  │ Chat Item│  │  │ Chat Header         │ │
│  [Contacts]│  │ [Avatar] │  │  ├─────────────────────┤ │
│  [Settings]│  │ Name     │  │  │ Messages            │ │
│            │  │ Preview  │  │  │                     │ │
│            │  └──────────┘  │  │ [Bubble In]         │ │
│            │  ┌──────────┐  │  │   [Bubble Out]      │ │
│            │  │ Chat Item│  │  │ [Bubble In]         │ │
│            │  └──────────┘  │  ├─────────────────────┤ │
│            │       ...      │  │ Input Area          │ │
│            │                │  │ [Attach][Input][Send]│ │
│            │                │  └─────────────────────┘ │
└────────────┴────────────────┴───────────────────────────┘
```

**Breakpoints:**

- **Desktop Large (>1440px)**: 3-column layout (sidebar + list + chat)
- **Desktop (1024-1440px)**: 2-column layout (list + chat, sidebar collapses to icons)
- **Tablet (768-1024px)**: 2-column layout (list + chat, sidebar hidden)
- **Mobile (<768px)**: Single column (stack navigation)

### Mobile Application Layout

```
┌─────────────────────┐
│  Header             │
│  [≡] Chats [Search] │
├─────────────────────┤
│                     │
│  ┌───────────────┐  │
│  │ Chat Item     │  │
│  │ [Avatar]      │  │
│  │ Name | Time   │  │
│  │ Message       │  │
│  │ [Badge: 3]    │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ Chat Item     │  │
│  └───────────────┘  │
│        ...          │
│                     │
├─────────────────────┤
│  Bottom Navigation  │
│  [Chats][Calls]     │
│  [Contacts][Settings]│
└─────────────────────┘
```

---

## Navigation Patterns

### Web Navigation

#### Primary Navigation (Sidebar)

```typescript
const navigationItems = [
  {
    icon: <MessageSquare />,
    label: 'Chats',
    href: '/chats',
    badge: unreadCount
  },
  {
    icon: <Phone />,
    label: 'Calls',
    href: '/calls',
    badge: missedCallsCount
  },
  {
    icon: <Users />,
    label: 'Contacts',
    href: '/contacts'
  },
  {
    icon: <Settings />,
    label: 'Settings',
    href: '/settings'
  }
];
```

#### Secondary Navigation (Command Palette)

**Keyboard Shortcut:** `Ctrl+K` / `Cmd+K`

```typescript
// Quick actions:
- New Chat (Ctrl+N)
- Search Messages (Ctrl+F)
- Go to Chats (Ctrl+1)
- Go to Calls (Ctrl+2)
- Go to Contacts (Ctrl+3)
- Go to Settings (Ctrl+4)
- Toggle Dark Mode (Ctrl+D)
```

### Mobile Navigation

#### Bottom Tab Navigation

```typescript
const tabs = [
  { name: 'Chats', icon: 'message-square', badge: unreadCount },
  { name: 'Calls', icon: 'phone', badge: missedCallsCount },
  { name: 'Contacts', icon: 'users' },
  { name: 'Settings', icon: 'settings' }
];
```

#### Gestures

- **Swipe Right on Chat Item**: Archive/Delete menu
- **Swipe Left on Chat Item**: Pin/Mute menu
- **Pull Down**: Refresh chat list
- **Long Press**: Multi-select mode
- **Swipe Left from Edge**: Go back

---

## Messaging UI Components

### Chat List Item

```typescript
interface ChatListItemProps {
  id: string;
  avatar: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isTyping: boolean;
}
```

**Visual Structure:**

```
┌─────────────────────────────────────────┐
│ ●  [Avatar]  Name              📌 12:34 │
│              Last message text... [3]    │
└─────────────────────────────────────────┘
 │      │       │                 │    │
 │      │       │                 │    └─ Unread badge
 │      │       │                 └────── Timestamp
 │      │       └──────────────────────── Last message preview
 │      └──────────────────────────────── Avatar (with online indicator)
 └─────────────────────────────────────── Pin indicator
```

**States:**

- **Default**: Normal text weight
- **Unread**: Bold name, blue badge
- **Pinned**: Pin icon, sticky at top
- **Muted**: Gray text, muted badge icon
- **Typing**: "typing..." in italics, animated dots
- **Draft**: "Draft:" prefix in red
- **Failed**: Red exclamation icon

### Message Bubble

```typescript
interface MessageBubbleProps {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEdited: boolean;
  replyTo?: Message;
  attachments?: Attachment[];
}
```

**Visual Structure (Outgoing):**

```
                        ┌────────────────────┐
                        │ Message text here  │
                        │ with multiple      │
                        │ lines of content   │
                        │            12:34 ✓✓│
                        └────────────────────┘
```

**Visual Structure (Incoming):**

```
┌────────────────────┐
│ Message text here  │
│ with multiple      │
│ lines of content   │
│ 12:34              │
└────────────────────┘
```

**Status Indicators (Outgoing Only):**

- **Sending**: ⏱ (clock icon, gray)
- **Sent**: ✓ (single checkmark, gray)
- **Delivered**: ✓✓ (double checkmark, gray)
- **Read**: ✓✓ (double checkmark, blue)
- **Failed**: ⚠ (exclamation, red)

**Edited Indicator:**

```
│ Message text (edited)        12:34 ✓✓│
```

### Message Input Area

```
┌──────────────────────────────────────────────────────────┐
│ [📎] [Input field: Type a message...          ] [🎤/➤]  │
└──────────────────────────────────────────────────────────┘
```

**Components:**

1. **Attach Button** (📎): Opens file/media picker
2. **Input Field**: Auto-expanding textarea (1-5 lines)
3. **Send/Voice Button**:
   - Empty input: Show microphone (voice message)
   - Has text: Show send arrow

**Input States:**

- **Empty**: Placeholder "Type a message...", show mic icon
- **Typing**: Show send icon, enable send button
- **Replying**: Show reply preview above input with close button
- **Editing**: Show "Edit message" label with cancel button

### Typing Indicator

```typescript
// In chat list
"John is typing..."

// In chat view (below last message)
┌────────────────┐
│ ● ● ●          │  // Animated dots
└────────────────┘
```

**Animation:** 3 dots bouncing sequentially (300ms cycle)

### Online Status Indicator

```typescript
// Avatar with online indicator
┌─────────┐
│  [IMG]  │
│    ● <──┴── Green dot (8px, bottom-right)
└─────────┘
```

**States:**

- **Online**: Green dot (solid)
- **Offline**: Gray ring (outline only)
- **Away**: Yellow dot (solid)
- **Last seen**: Show text "last seen 5 min ago" in chat header

---

## Animations & Transitions

### Global Animation Settings

```css
:root {
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
  --spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Message Animations

**New Message Appears:**

```css
@keyframes message-appear {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-enter {
  animation: message-appear 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Message Status Change:**

```css
@keyframes status-change {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.status-icon {
  animation: status-change 300ms ease-out;
}
```

**Typing Indicator:**

```css
@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}

.typing-dot:nth-child(1) { animation-delay: 0ms; }
.typing-dot:nth-child(2) { animation-delay: 150ms; }
.typing-dot:nth-child(3) { animation-delay: 300ms; }
```

### Interaction Animations

**Button Press:**

```css
.button:active {
  transform: scale(0.95);
  transition: transform 100ms ease-out;
}
```

**List Item Hover:**

```css
.chat-item {
  transition: background-color 150ms ease-out;
}

.chat-item:hover {
  background-color: var(--background-secondary);
}
```

**Modal Open:**

```css
@keyframes modal-overlay {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modal-content {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### Skeleton Loading

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  animation: skeleton-pulse 2s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    var(--background-secondary) 50%,
    var(--border) 75%
  );
  background-size: 200% 100%;
}
```

---

## Responsive Design

### Breakpoint System

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / Small desktop
  xl: '1440px',  // Desktop
  '2xl': '1920px' // Large desktop
};
```

### Layout Adaptations

#### Chat List

**Desktop (>1024px):**
- Width: 320-400px (resizable)
- Show avatar, name, preview, timestamp, badges
- 2-line message preview

**Tablet (768-1024px):**
- Width: 280px (fixed)
- Show avatar, name, preview (truncated), badges
- 1-line message preview

**Mobile (<768px):**
- Full width
- Show avatar, name, preview (truncated), badges
- 1-line message preview

#### Message Bubbles

**Desktop:**
- Max width: 60% of chat area
- Show full timestamps

**Mobile:**
- Max width: 80% of screen width
- Show abbreviated timestamps (e.g., "12:34" instead of "Today at 12:34 PM")

### Font Size Scaling

```css
/* Base: 16px */
html { font-size: 16px; }

/* Mobile (<768px): 15px */
@media (max-width: 767px) {
  html { font-size: 15px; }
}

/* Large Desktop (>1920px): 18px */
@media (min-width: 1921px) {
  html { font-size: 18px; }
}
```

---

## Accessibility

### Keyboard Navigation

#### Global Shortcuts

```typescript
const shortcuts = {
  'Ctrl+K': 'Open command palette',
  'Ctrl+N': 'New chat',
  'Ctrl+F': 'Search in chat',
  'Ctrl+1-4': 'Navigate to tab',
  'Ctrl+D': 'Toggle dark mode',
  'Esc': 'Close modal/Clear selection',
  'Tab': 'Navigate forward',
  'Shift+Tab': 'Navigate backward',
  'Enter': 'Activate focused element',
  'Space': 'Activate focused element (buttons)',
  'Arrow Up/Down': 'Navigate list items',
  'Arrow Left/Right': 'Navigate tabs',
};
```

#### Chat-Specific Shortcuts

```typescript
const chatShortcuts = {
  'Ctrl+Up': 'Edit last message',
  'Ctrl+Shift+D': 'Delete message',
  'Ctrl+R': 'Reply to message',
  'Ctrl+E': 'Edit selected message',
  'Ctrl+C': 'Copy selected message',
};
```

### ARIA Labels

```typescript
// Chat list item
<div
  role="button"
  tabIndex={0}
  aria-label={`Chat with ${name}, ${unreadCount} unread messages, last message: ${preview}`}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>

// Message bubble
<div
  role="article"
  aria-label={`Message from ${sender} at ${timestamp}: ${content}`}
  aria-live={isNewMessage ? 'polite' : 'off'}
>

// Send button
<button
  aria-label="Send message"
  aria-disabled={!canSend}
  disabled={!canSend}
>

// Typing indicator
<div
  role="status"
  aria-live="polite"
  aria-label={`${userName} is typing`}
>
```

### Focus Management

```css
/* Custom focus ring (matches Telegram) */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Remove default outline */
*:focus {
  outline: none;
}
```

### Screen Reader Support

```typescript
// Announce new messages
<div role="log" aria-live="polite" aria-atomic="true">
  {newMessages.map(msg => (
    <div key={msg.id} className="sr-only">
      New message from {msg.sender}: {msg.content}
    </div>
  ))}
</div>

// Hidden text for screen readers only
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Color Contrast

All text must meet WCAG AA standards:
- **Normal text (16px)**: 4.5:1 contrast ratio
- **Large text (24px)**: 3:1 contrast ratio
- **UI components**: 3:1 contrast ratio

**Testing Tools:**
- Chrome DevTools: Lighthouse accessibility audit
- axe DevTools extension
- WAVE browser extension

---

## Implementation Examples

### Chat List Component (Web)

```typescript
// components/chat-list.tsx
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Pin, Volume2 } from 'lucide-react';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isTyping: boolean;
}

export const ChatList = ({ chats, onSelectChat }: { chats: Chat[]; onSelectChat: (id: string) => void }) => {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {chats.map((chat) => (
          <div
            key={chat.id}
            role="button"
            tabIndex={0}
            className={cn(
              "flex items-center gap-3 p-3 hover:bg-secondary cursor-pointer transition-colors",
              "border-b border-border last:border-0"
            )}
            onClick={() => onSelectChat(chat.id)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectChat(chat.id)}
          >
            {/* Avatar with online indicator */}
            <div className="relative">
              <Avatar>
                <img src={chat.avatar} alt={chat.name} />
              </Avatar>
              {chat.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-base truncate",
                    chat.unreadCount > 0 && "font-semibold"
                  )}>
                    {chat.name}
                  </span>
                  {chat.isPinned && (
                    <Pin className="w-4 h-4 text-muted-foreground" />
                  )}
                  {chat.isMuted && (
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatDistanceToNow(chat.timestamp, { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-sm text-muted-foreground truncate",
                  chat.isTyping && "italic text-primary"
                )}>
                  {chat.isTyping ? 'typing...' : chat.lastMessage}
                </p>
                {chat.unreadCount > 0 && (
                  <Badge variant="default" className="ml-2 min-w-[20px] h-5 flex items-center justify-center">
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
```

### Message Bubble Component (Web)

```typescript
// components/message-bubble.tsx
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEdited: boolean;
  senderAvatar?: string;
  senderName?: string;
}

const StatusIcon = ({ status }: { status: MessageBubbleProps['status'] }) => {
  const icons = {
    sending: <Clock className="w-4 h-4 text-muted-foreground" />,
    sent: <Check className="w-4 h-4 text-muted-foreground" />,
    delivered: <CheckCheck className="w-4 h-4 text-muted-foreground" />,
    read: <CheckCheck className="w-4 h-4 text-primary" />,
    failed: <AlertCircle className="w-4 h-4 text-destructive" />,
  };
  return icons[status];
};

export const MessageBubble = ({
  content,
  sender,
  timestamp,
  status,
  isEdited,
  senderAvatar,
  senderName,
}: MessageBubbleProps) => {
  const isMe = sender === 'me';

  return (
    <div className={cn(
      "flex gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200",
      isMe ? "justify-end" : "justify-start"
    )}>
      {/* Avatar (for incoming messages only) */}
      {!isMe && senderAvatar && (
        <Avatar className="w-8 h-8 mt-1">
          <img src={senderAvatar} alt={senderName} />
        </Avatar>
      )}

      {/* Bubble */}
      <div className={cn(
        "max-w-[60%] rounded-lg px-4 py-2 shadow-sm",
        isMe
          ? "bg-primary text-primary-foreground"
          : "bg-card text-card-foreground"
      )}>
        {/* Sender name (for group chats) */}
        {!isMe && senderName && (
          <p className="text-xs font-semibold text-primary mb-1">
            {senderName}
          </p>
        )}

        {/* Content */}
        <p className="text-base whitespace-pre-wrap break-words">
          {content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-end gap-1 mt-1">
          {isEdited && (
            <span className="text-xs opacity-70">edited</span>
          )}
          <span className="text-xs opacity-70">
            {format(timestamp, 'HH:mm')}
          </span>
          {isMe && <StatusIcon status={status} />}
        </div>
      </div>
    </div>
  );
};
```

### Message Input Component (Web)

```typescript
// components/message-input.tsx
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef, KeyboardEvent } from 'react';
import { Paperclip, Mic, Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onAttach: () => void;
  onVoiceRecord: () => void;
  placeholder?: string;
}

export const MessageInput = ({
  onSend,
  onAttach,
  onVoiceRecord,
  placeholder = 'Type a message...',
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      {/* Attach Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onAttach}
        aria-label="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </Button>

      {/* Text Input */}
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[44px] max-h-[120px] resize-none"
        rows={1}
      />

      {/* Send / Voice Button */}
      {message.trim() ? (
        <Button
          onClick={handleSend}
          size="icon"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoiceRecord}
          aria-label="Record voice message"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};
```

### Chat List Item Component (Mobile - React Native)

```typescript
// components/ChatListItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar, Badge } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';

interface ChatListItemProps {
  chat: {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    timestamp: Date;
    unreadCount: number;
    isOnline: boolean;
    isPinned: boolean;
  };
  onPress: (id: string) => void;
}

export const ChatListItem = ({ chat, onPress }: ChatListItemProps) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(chat.id)}
      activeOpacity={0.7}
    >
      {/* Avatar with online indicator */}
      <View style={styles.avatarContainer}>
        <Avatar.Image size={56} source={{ uri: chat.avatar }} />
        {chat.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[
            styles.name,
            chat.unreadCount > 0 && styles.unreadName
          ]}>
            {chat.name}
          </Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(chat.timestamp, { addSuffix: true })}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {chat.lastMessage}
          </Text>
          {chat.unreadCount > 0 && (
            <Badge style={styles.badge}>
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </Badge>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#28a745',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: '#262626',
  },
  unreadName: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#737373',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#737373',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#0088cc',
  },
});
```

---

## Performance Optimization

### Virtual Scrolling

For long chat lists and message histories, use virtualization:

**Web:**
```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const ChatList = ({ chats }: { chats: Chat[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: chats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated item height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ChatListItem chat={chats[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Mobile:**
```bash
npm install react-native-flash-list
```

```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={chats}
  renderItem={({ item }) => <ChatListItem chat={item} />}
  estimatedItemSize={72}
  keyExtractor={(item) => item.id}
/>
```

### Image Optimization

**Web:**
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={avatar}
  alt={name}
  width={56}
  height={56}
  className="rounded-full"
  loading="lazy"
  placeholder="blur"
/>
```

**Mobile:**
```typescript
// Use React Native Fast Image
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: avatar, priority: FastImage.priority.normal }}
  style={{ width: 56, height: 56, borderRadius: 28 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

### Debouncing & Throttling

**Typing Indicator (Debounce):**
```typescript
import { useDebounce } from 'use-debounce';

const MessageInput = () => {
  const [message, setMessage] = useState('');
  const [debouncedMessage] = useDebounce(message, 500);

  useEffect(() => {
    if (debouncedMessage) {
      // Send "typing" event
      socket.emit('typing', { chatId });
    } else {
      // Send "stopped typing" event
      socket.emit('stopped-typing', { chatId });
    }
  }, [debouncedMessage]);
};
```

**Scroll Events (Throttle):**
```typescript
import { throttle } from 'lodash-es';

const handleScroll = throttle((event) => {
  // Load more messages when scrolled to top
  if (event.target.scrollTop < 100) {
    loadMoreMessages();
  }
}, 200);
```

---

## Theme Switching

### Web Implementation

```typescript
// contexts/theme-context.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load from localStorage
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'light';
  });

  useEffect(() => {
    // Update document attribute
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### Mobile Implementation

```typescript
// App.tsx
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

const App = () => {
  const colorScheme = useColorScheme(); // 'light' | 'dark'
  const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={theme}>
      {/* App content */}
    </PaperProvider>
  );
};
```

---

## Testing UI Components

### Visual Regression Testing

```bash
npm install -D @storybook/react chromatic
```

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Send Message',
    variant: 'default',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Attach File',
    variant: 'ghost',
  },
};
```

### Accessibility Testing

```bash
npm install -D @testing-library/react @testing-library/jest-dom @axe-core/react
```

```typescript
// MessageBubble.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MessageBubble } from './MessageBubble';

expect.extend(toHaveNoViolations);

test('MessageBubble has no accessibility violations', async () => {
  const { container } = render(
    <MessageBubble
      id="1"
      content="Hello world"
      sender="me"
      timestamp={new Date()}
      status="sent"
      isEdited={false}
    />
  );

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Design Checklist

Before marking a UI component as "complete", verify:

- [ ] **Design System Compliance**
  - [ ] Uses design tokens (colors, spacing, typography)
  - [ ] Matches Telegram reference design
  - [ ] Responsive across all breakpoints
  - [ ] Supports light and dark themes

- [ ] **Accessibility**
  - [ ] Keyboard navigable (Tab, Enter, Arrow keys)
  - [ ] ARIA labels on interactive elements
  - [ ] Sufficient color contrast (WCAG AA)
  - [ ] Screen reader friendly
  - [ ] Focus indicators visible

- [ ] **Performance**
  - [ ] No layout shift (CLS = 0)
  - [ ] Lazy load images and heavy components
  - [ ] Virtual scrolling for long lists
  - [ ] Debounced/throttled expensive operations

- [ ] **Animations**
  - [ ] Smooth 60fps transitions
  - [ ] respects `prefers-reduced-motion`
  - [ ] No janky animations on low-end devices

- [ ] **Interactivity**
  - [ ] Loading states for async operations
  - [ ] Error states with retry actions
  - [ ] Empty states with helpful messages
  - [ ] Optimistic UI updates
  - [ ] Proper hover/active/focus states

- [ ] **Testing**
  - [ ] Unit tests for logic
  - [ ] Integration tests for user flows
  - [ ] Visual regression tests (Storybook/Chromatic)
  - [ ] Accessibility tests (axe-core)
  - [ ] Cross-browser testing

---

## Resources

### Design References

- **Telegram Web**: https://web.telegram.org
- **Telegram Desktop**: https://desktop.telegram.org
- **Telegram Mobile**: iOS/Android apps

### Component Libraries

- **shadcn/ui**: https://ui.shadcn.com
- **Radix UI**: https://www.radix-ui.com
- **React Native Paper**: https://reactnativepaper.com

### Design Tools

- **Figma**: https://www.figma.com
- **Storybook**: https://storybook.js.org
- **Chromatic**: https://www.chromatic.com (visual testing)

### Accessibility

- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org

### Performance

- **Lighthouse**: Built into Chrome DevTools
- **Web Vitals**: https://web.dev/vitals/
- **React DevTools Profiler**: https://react.dev/learn/react-developer-tools

---

## Appendix: Component Inventory

### Required Components (Web)

| Component | shadcn/ui | Priority | Status |
|-----------|-----------|----------|--------|
| Avatar | ✓ | P0 | - |
| Badge | ✓ | P0 | - |
| Button | ✓ | P0 | - |
| Input | ✓ | P0 | - |
| Textarea | ✓ | P0 | - |
| Card | ✓ | P0 | - |
| Dialog | ✓ | P0 | - |
| Dropdown Menu | ✓ | P0 | - |
| Scroll Area | ✓ | P0 | - |
| Tooltip | ✓ | P1 | - |
| Context Menu | ✓ | P1 | - |
| Sheet (Side Panel) | ✓ | P1 | - |
| Command (Cmd+K) | ✓ | P1 | - |
| Sonner (Toast) | ✓ | P1 | - |
| Skeleton | ✓ | P1 | - |
| Spinner | ✓ | P1 | - |
| Progress | ✓ | P2 | - |
| Tabs | ✓ | P2 | - |
| Checkbox | ✓ | P2 | - |
| Switch | ✓ | P2 | - |
| Chat List Item | Custom | P0 | - |
| Message Bubble | Custom | P0 | - |
| Message Input | Custom | P0 | - |
| Typing Indicator | Custom | P0 | - |
| Online Status | Custom | P0 | - |
| File Preview | Custom | P1 | - |
| Voice Message | Custom | P1 | - |
| Call UI | Custom | P1 | - |

### Required Components (Mobile)

| Component | RN Paper | Priority | Status |
|-----------|----------|----------|--------|
| Avatar | ✓ | P0 | - |
| Badge | ✓ | P0 | - |
| Button | ✓ | P0 | - |
| TextInput | ✓ | P0 | - |
| Card | ✓ | P0 | - |
| Dialog | ✓ | P0 | - |
| Menu | ✓ | P0 | - |
| Snackbar | ✓ | P0 | - |
| ActivityIndicator | ✓ | P0 | - |
| Appbar | ✓ | P0 | - |
| List | ✓ | P0 | - |
| Divider | ✓ | P1 | - |
| Chip | ✓ | P1 | - |
| Switch | ✓ | P1 | - |
| Checkbox | ✓ | P2 | - |
| Chat List Item | Custom | P0 | - |
| Message Bubble | Custom | P0 | - |
| Message Input | Custom | P0 | - |
| Typing Indicator | Custom | P0 | - |
| Voice Recorder | Custom | P1 | - |
| Image Viewer | Custom | P1 | - |

---

**End of UI/UX Guidelines**
