# Frontend Action Plan - Path to Production

**Date**: October 24, 2025  
**Current Progress**: 104/162 story points (64%)  
**Target**: Production-ready v1.0

---

## 🚨 CRITICAL PATH TO LAUNCH (16 points, ~2-3 days)

### 1. Privacy Policy & Terms Pages (3 points) - LEGAL BLOCKER 🔴
**Why Critical**: Cannot legally operate without these pages. GDPR/CCPA requirement.

**Implementation Steps**:
```typescript
// 1. Create Privacy Policy page
frontend/src/pages/PrivacyPolicy.tsx
- Load from markdown or API
- Show "Last Updated" date
- Professional formatting
- Link to contact/data request

// 2. Create Terms of Service page
frontend/src/pages/TermsOfService.tsx
- Service terms
- User responsibilities
- Disclaimer
- Acceptance requirement

// 3. Update Registration flow
frontend/src/pages/Register.tsx
- Add consent checkboxes:
  ✓ I agree to Terms of Service (required)
  ✓ I agree to Privacy Policy (required)
  ☐ Marketing emails (optional)
- Links open in new tab
- Cannot register without checking

// 4. Add Footer with links
frontend/src/components/Footer.tsx
- Privacy Policy link
- Terms of Service link
- Contact link
- Version info

// 5. Update routes
App.tsx
- Add /privacy route
- Add /terms route
```

**API Endpoints**:
- None needed (static pages) or GET `/api/legal/privacy`, GET `/api/legal/terms`

**Acceptance Criteria**:
- ✅ Privacy policy accessible at /privacy
- ✅ Terms accessible at /terms
- ✅ Registration requires consent
- ✅ Footer links on all pages
- ✅ Last updated date visible
- ✅ GDPR compliant language

**Estimated Time**: 4-6 hours

---

### 2. Notification Center (8 points) - UX REQUIREMENT 🔴
**Why Critical**: Users have no way to see missed messages/calls. Expected feature.

**Implementation Steps**:
```typescript
// 1. Create NotificationCenter component
frontend/src/components/NotificationCenter.tsx
- Bell icon in header (next to avatar)
- Badge with unread count
- Dropdown panel (Popover)
- Notification list (newest first)
- Notification types: message, call, mention, admin
- Icons per type
- Click navigates to content
- Mark as read button (per item)
- Clear all button
- Empty state

// 2. Create Notification item component
frontend/src/components/NotificationItem.tsx
- Avatar of sender
- Notification text
- Timestamp (relative)
- Icon badge (message/call/mention)
- Unread indicator (blue dot)
- onClick handler

// 3. Add to Layout
frontend/src/components/Layout.tsx
- Add NotificationCenter to header
- Position: right side, before avatar

// 4. Integrate WebSocket
frontend/src/hooks/useNotifications.ts
- Listen for 'notification' events
- Update unread count in real-time
- Show toast for new notifications
- Fetch history on mount
```

**API Endpoints**:
- GET `/api/notifications` - List notifications (paginated)
- PATCH `/api/notifications/:id/read` - Mark as read
- POST `/api/notifications/read-all` - Mark all as read
- DELETE `/api/notifications` - Clear all

**WebSocket Events**:
- `notification` - New notification received

**Notification Types**:
```typescript
interface Notification {
  id: string;
  type: 'message' | 'call' | 'mention' | 'admin' | 'system';
  title: string;
  body: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  link?: string; // Navigate on click
  read: boolean;
  createdAt: string;
}
```

**Acceptance Criteria**:
- ✅ Badge shows unread count
- ✅ Real-time updates via WebSocket
- ✅ Click notification navigates to content
- ✅ Mark as read functionality
- ✅ Clear all notifications
- ✅ Empty state when no notifications
- ✅ Grouped by date (Today, Yesterday, etc.)

**Estimated Time**: 8-10 hours

---

### 3. Active Sessions Management (5 points) - SECURITY FEATURE 🟡
**Why Important**: Users should see and revoke active sessions for security.

**Implementation Steps**:
```typescript
// 1. Create ActiveSessions component
frontend/src/components/ActiveSessions.tsx
- Add to Settings > Security tab
- Session list with:
  - Device type (Desktop/Mobile/Tablet)
  - Browser and OS
  - IP address
  - Location (city, country)
  - Last activity timestamp
  - "Current Session" badge
  - Revoke button (except current)
- "Revoke All Other Sessions" button
- Confirmation dialog
- Session limit warning (max 5)

// 2. Add to Settings
frontend/src/pages/Settings.tsx
- Add ActiveSessions to Security tab
- Below password change section
```

**API Endpoints**:
- GET `/api/auth/sessions` - List active sessions
- DELETE `/api/auth/sessions/:id` - Revoke session
- DELETE `/api/auth/sessions` - Revoke all other sessions

**Session Format**:
```typescript
interface Session {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string; // "San Francisco, CA"
  lastActivity: string;
  isCurrent: boolean;
}
```

**Acceptance Criteria**:
- ✅ Display all active sessions
- ✅ Show current session badge
- ✅ Revoke individual sessions
- ✅ Revoke all other sessions
- ✅ Confirmation before revoke
- ✅ Max 5 sessions enforced
- ✅ Auto-revoke oldest on 6th login

**Estimated Time**: 5-6 hours

---

## 🟡 HIGH PRIORITY (Next Phase - 23 points, ~2-3 days)

### 4. 2FA Complete Setup Flow (5 points)
**Why Important**: Security best practice, especially for admin accounts.

**Implementation Steps**:
```typescript
// 1. Create TwoFactorSetup component
frontend/src/components/TwoFactorSetup.tsx
- QR code display (generated from secret)
- Manual entry key (for copy/paste)
- TOTP verification input (6 digits)
- Backup codes display (10 codes)
- Download backup codes button
- Enable/Disable toggle
- Verification before disable

// 2. Add to Settings
frontend/src/pages/Settings.tsx
- Add to Security tab
- Show setup wizard if not enabled
- Show status if enabled

// 3. Add to Login flow
frontend/src/pages/Login.tsx
- If 2FA enabled, show TOTP input
- Verify code before login
- "Use backup code" option
```

**API Endpoints**:
- POST `/api/auth/2fa/setup` - Generate secret and QR
- POST `/api/auth/2fa/verify` - Verify TOTP code
- POST `/api/auth/2fa/enable` - Enable 2FA
- POST `/api/auth/2fa/disable` - Disable 2FA (requires verification)
- GET `/api/auth/2fa/backup-codes` - Generate backup codes
- POST `/api/auth/2fa/login` - Verify 2FA during login

**Acceptance Criteria**:
- ✅ QR code generation
- ✅ TOTP verification
- ✅ Backup codes displayed and downloadable
- ✅ Cannot disable without verification
- ✅ Login requires 2FA if enabled
- ✅ Backup code option

**Estimated Time**: 6-8 hours

---

### 5. Push Notifications (8 points)
**Why Important**: Critical for mobile users to receive notifications when app is closed.

**Implementation Steps**:
```typescript
// 1. Set up Firebase Cloud Messaging
// Install: npm install firebase
frontend/src/lib/firebase.ts
- Initialize Firebase app
- Get FCM token
- Handle foreground messages

// 2. Request permission
frontend/src/hooks/useNotificationPermission.ts
- Request browser notification permission
- Register service worker
- Send FCM token to backend

// 3. Handle notifications
frontend/public/firebase-messaging-sw.js
- Service worker for background notifications
- Show notification on message
- Handle notification click

// 4. Add to Settings
frontend/src/pages/Settings.tsx
- Add Notifications tab
- Show permission status
- Enable/disable push notifications
- Request permission button
```

**API Endpoints**:
- POST `/api/push/register` - Register FCM token
- DELETE `/api/push/unregister` - Remove FCM token

**Browser Notifications**:
```typescript
if ('Notification' in window) {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Register FCM token
  }
}
```

**Acceptance Criteria**:
- ✅ Request notification permission
- ✅ Register FCM token with backend
- ✅ Receive push notifications when app closed
- ✅ Notification click opens app to correct screen
- ✅ Respects notification preferences
- ✅ Works on mobile web and PWA

**Estimated Time**: 10-12 hours

---

### 6. Message Status Indicators Enhancement (2 points)
**Why Important**: Users expect to see delivery confirmation (WhatsApp standard).

**Implementation Steps**:
```typescript
// 1. Update Message component
frontend/src/components/Message.tsx
- Add status icons:
  - Clock icon: Sending
  - Single checkmark: Sent to server
  - Double checkmark (gray): Delivered to recipient
  - Double checkmark (blue): Read by recipient
- Position: bottom right of message bubble

// 2. Update ChatView
frontend/src/pages/ChatView.tsx
- Listen for 'message:delivered' WebSocket event
- Update message status in real-time

// 3. Add settings toggle
frontend/src/pages/Settings.tsx > Privacy tab
- "Send read receipts" toggle
- Disable to prevent sending read status
```

**API Endpoints**:
- None needed (handled via WebSocket)

**WebSocket Events**:
- `message:delivered` - Message delivered to recipient
- `message:read` - Message read by recipient

**Acceptance Criteria**:
- ✅ Visual distinction between sent/delivered/read
- ✅ Real-time status updates
- ✅ Privacy toggle to disable read receipts
- ✅ Group message shows read count

**Estimated Time**: 3-4 hours

---

## 🟢 MEDIUM PRIORITY (Polish Phase - 16 points, ~2 days)

### 7. Message Search (3 points)
Quick search within conversations.

**Files**: `SearchMessages.tsx`, update `ChatView.tsx`  
**Time**: 4-5 hours

---

### 8. Notification Preferences (5 points)
Granular control over notification types and quiet hours.

**Files**: Update `Settings.tsx` Notifications tab  
**Time**: 5-6 hours

---

### 9. File Preview Gallery (5 points)
Lightbox for images, video player, PDF viewer.

**Files**: `FilePreview.tsx`, `ImageGallery.tsx`  
**Time**: 6-8 hours

---

### 10. Performance Optimization (3 points)
Code splitting, lazy loading, bundle size reduction.

**Tasks**: Vite config, lazy imports, bundle analysis  
**Time**: 4-5 hours

---

## 📅 Recommended Implementation Schedule

### Week 1: Critical Path (16 points)
**Day 1**:
- ✅ Privacy Policy & Terms pages (3 points)
- ✅ Update registration flow
- ✅ Add footer links

**Day 2-3**:
- ✅ Notification Center (8 points)
- ✅ WebSocket integration

**Day 4**:
- ✅ Active Sessions Management (5 points)

### Week 2: High Priority (23 points)
**Day 1-2**:
- ✅ 2FA Complete Setup (5 points)
- ✅ Update login flow

**Day 3-4**:
- ✅ Push Notifications (8 points)
- ✅ FCM setup

**Day 5**:
- ✅ Message Status Enhancement (2 points)
- Testing and bug fixes

### Week 3: Polish & Launch Prep (16 points)
**Day 1**: Message Search (3 points)  
**Day 2**: Notification Preferences (5 points)  
**Day 3**: File Preview Gallery (5 points)  
**Day 4**: Performance Optimization (3 points)  
**Day 5**: Final testing, documentation, deployment

---

## 🎯 Success Criteria for v1.0 Launch

### Must Have (Blockers) ✅
- ✅ Privacy Policy & Terms pages
- ✅ Notification Center
- ✅ Push Notifications (mobile users)
- ✅ Active Sessions Management
- ✅ All existing features fully functional

### Should Have (High Priority) ⚠️
- ✅ 2FA Setup Flow
- ✅ Message Status Indicators (complete)
- ⚠️ Message Search (can defer to v1.1)

### Nice to Have (Can defer) 🟢
- File Preview Gallery
- Notification Preferences
- Performance Optimization
- All LOW priority features

---

## 📊 Timeline Summary

| Phase | Points | Days | Features |
|-------|--------|------|----------|
| Critical Path | 16 | 3-4 | Privacy, Notifications, Sessions |
| High Priority | 23 | 2-3 | 2FA, Push, Status |
| Polish | 16 | 2 | Search, Prefs, Preview, Perf |
| **TOTAL** | **55** | **7-9 days** | **v1.0 Production Ready** |

**Target Launch**: ~2 weeks from now (including testing)

---

## 🚀 What Happens After Launch?

### Phase 2 (v1.1) - Enhancement Release
- Message search (if deferred)
- File preview gallery
- Advanced notification preferences
- Keyboard shortcuts
- Accessibility improvements
- Performance optimization

### Phase 3 (v1.2) - Admin Enhancements
- System settings configuration
- Announcements management
- User reports management

### Phase 4 (v2.0) - Advanced Features
- Screen sharing in calls
- Call recording
- Message reactions (full integration)
- Advanced group features
- Comprehensive testing suite

---

**Next Action**: Start with Privacy Policy & Terms pages (highest priority, legal blocker)

**Document Version**: 1.0  
**Last Updated**: October 24, 2025  
**Status**: Ready for Implementation
