# TypeScript Issues - Fix List

## Overview

The mobile app has **49 TypeScript errors** that need to be resolved. These errors don't prevent the app from running but should be fixed for production.

**Priority**: Medium (non-blocking for testing)
**Estimated Time**: 4-6 hours

---

## Critical Issues (Fix First)

### 1. Notification Handler Type Mismatch

**Files**: `App.tsx:13`, `pushNotifications.ts:18`

**Error**:
```
Type '{ shouldShowAlert: true; shouldPlaySound: true; shouldSetBadge: false; }'
is not assignable to type 'NotificationBehavior'.
Missing properties: shouldShowBanner, shouldShowList
```

**Fix**:
```typescript
// Before
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// After
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

---

### 2. Missing Navigation Type Package

**Files**: Multiple auth screens

**Error**:
```
Cannot find module '@react-navigation/native-stack' or its corresponding type declarations
```

**Fix**:
```bash
npm install --save-dev @types/react-navigation__native-stack
```

Or add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

**Current Workaround**: Local type definition added as `type NativeStackNavigationProp<T, K extends keyof T> = any;`

---

### 3. ChatScreen useEffect Missing Dependency

**File**: `ChatScreen.tsx:66`

**Error**:
```
React Hook useEffect has a missing dependency: 'loadMessages'
```

**Fix**:
```typescript
// Before
useEffect(() => {
  if (conversationId) {
    loadMessages(conversationId);
  }
}, [conversationId]);

// After
useEffect(() => {
  if (conversationId) {
    loadMessages(conversationId);
  }
}, [conversationId, loadMessages]);
```

---

### 4. Duplicate Property in ChatScreen Styles

**File**: `ChatScreen.tsx:671`

**Error**:
```
An object literal cannot have multiple properties with the same name
```

**Fix**: Review styles object and remove duplicate property key.

---

## Medium Priority Issues

### 5. Email Verification Alert.prompt Type Error

**File**: `EmailVerificationScreen.tsx:145`

**Error**:
```
Parameter 'verificationToken' implicitly has an 'any' type
```

**Fix**:
```typescript
// Before
Alert.prompt(
  'Enter Verification Code',
  'Please enter the verification code from your email',
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Verify',
      onPress: (verificationToken) => {  // <-- implicit any
        if (verificationToken) {
          verifyEmail(verificationToken);
        }
      },
    },
  ],
  'plain-text'
);

// After
Alert.prompt(
  'Enter Verification Code',
  'Please enter the verification code from your email',
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Verify',
      onPress: (verificationToken?: string) => {  // <-- explicit type
        if (verificationToken) {
          verifyEmail(verificationToken);
        }
      },
    },
  ],
  'plain-text'
);
```

---

### 6. Contacts Service Image Type Mismatch

**File**: `contactsService.ts:67`

**Error**:
```
Type 'Image | undefined' is not assignable to type '{ uri: string; } | undefined'.
Property 'uri' of type 'string | undefined' is not assignable to type 'string'.
```

**Fix**:
```typescript
// Update DeviceContact type
interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers?: { number: string; label: string; }[];
  emails?: { email: string; label: string; }[];
  imageAvailable: boolean;
  image?: { uri?: string };  // <-- Make uri optional
}

// Or in mapping code
const contacts: DeviceContact[] = data.map((contact) => ({
  id: contact.id,
  name: contact.name || 'Unknown',
  phoneNumbers: contact.phoneNumbers,
  emails: contact.emails,
  imageAvailable: contact.imageAvailable,
  image: contact.image?.uri ? { uri: contact.image.uri } : undefined,  // <-- Ensure uri exists
}));
```

---

### 7. Notification Trigger Type Error

**File**: `pushNotifications.ts:58`

**Error**:
```
Type '{ seconds: number; }' is not assignable to type 'NotificationTriggerInput'.
Property 'type' is missing
```

**Fix**:
```typescript
// Before
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Test Notification",
    body: "This is a test",
  },
  trigger: { seconds: 2 },  // <-- Missing type property
});

// After
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Test Notification",
    body: "This is a test",
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 2,
  },
});
```

---

### 8. Performance Utils `this` Type Error

**File**: `performance.ts:257`

**Error**:
```
'this' implicitly has type 'any' because it does not have a type annotation
```

**Fix**:
```typescript
// Add explicit this type to method
class PerformanceOptimizer {
  public someMethod(this: PerformanceOptimizer) {
    // method body
  }
}
```

---

## Low Priority Issues (Test Files)

### 9. Test File Scope Errors

**File**: `LoginScreen.test.tsx` (multiple errors)

**Error**:
```
Cannot find name 'getByTestId', 'getByText', 'queryByText'
```

**Fix**: These are from React Native Testing Library. Import them:

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// In test
it('should work', () => {
  const { getByTestId, getByText, queryByText } = render(<LoginScreen />);
  // Now these are in scope
});
```

Or use screen object:
```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';

it('should work', () => {
  render(<LoginScreen />);
  const button = screen.getByTestId('login-button');
  fireEvent.press(button);
});
```

---

### 10. Test Helpers Platform Errors

**File**: `testHelpers.ts:91, 94`

**Error**:
```
Cannot find name 'Platform'
```

**Fix**:
```typescript
import { Platform } from 'react-native';
```

---

## Fixing Strategy

### Phase 1: Quick Wins (1-2 hours)

1. Add missing imports (Platform, testing library)
2. Fix notification handler properties
3. Fix Alert.prompt type
4. Add useEffect dependencies

### Phase 2: Type Definitions (1-2 hours)

5. Install missing type packages or update tsconfig
6. Fix contact service types
7. Fix notification trigger type
8. Fix performance utils `this` type

### Phase 3: Code Review (1-2 hours)

9. Find and remove duplicate style properties
10. Review all test files and fix imports
11. Run `tsc --noEmit` to verify all fixes
12. Enable type-check in package.json prepare script

---

## Testing After Fixes

```bash
# Check types
npm run type-check

# Should output: "Found 0 errors"

# Run tests
npm test

# Build (should work without errors)
eas build --profile development --platform android
```

---

## Prevention

To prevent future type errors:

1. **Enable strict type checking** in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

2. **Use ESLint** with TypeScript rules:
```bash
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

3. **Run type-check before commits**:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint"
    }
  }
}
```

4. **CI/CD pipeline**: Add type-check to automated tests

---

## Summary

| Category | Count | Priority | Time |
|----------|-------|----------|------|
| Critical Errors | 4 | High | 1-2h |
| Medium Priority | 5 | Medium | 2-3h |
| Test File Errors | 40 | Low | 1-2h |
| **Total** | **49** | - | **4-6h** |

**Current Status**: Type-check disabled in `package.json` prepare script to allow installation and testing.

**Recommendation**: Fix critical errors first, then medium priority, then test files when writing tests.

---

**Next Steps**:
1. Review this list
2. Fix critical errors (1-2 hours)
3. Test after each fix
4. Re-enable type-check: `"prepare": "npm run type-check"`
5. Verify build works

---

**Last Updated**: 2025-11-05
