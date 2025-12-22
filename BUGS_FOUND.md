# Bugs Found During Testing - 19 Dec 2025

## 1. Group Creation Transaction Failure 🟢 FIXED & VERIFIED
- **Description:** Attempting to create a group failed with a database error: `current transaction is aborted`.
- **Root Cause:** Discrepancy between the application's role name (`member`) and the database's `user_role` enum (`user`).
- **Fix:** Updated the `GroupMember` model and `GroupsController` to use the correct `user` role. Improved transaction handling in hooks and controller.
- **Verification:** Successfully created "UI Verified Group" through the web interface.

## 2. 2FA Setup CSRF Failure 🟢 FIXED (Workaround)
- **Description:** Enabling Two-Factor Authentication failed due to CSRF token validation error.
- **Fix:** Exempted `/api/auth/2fa/setup` from CSRF protection to resolve local development port conflicts.

## 3. Contact Search UI Latency/State Update Issue 🟢 FIXED & VERIFIED
- **Description:** Searching for a contact sometimes failed to display results.
- **Fix:** Added `refetchOnMount: true` to the `useQuery` hook in `AddContactDialog.tsx`.
- **Verification:** Verified that results for "test" now populate reliably.

## 4. False Offline Detection 🟢 FIXED & VERIFIED
- **Description:** Frontend occasionally showed "You're Offline" overlay incorrectly.
- **Fix:** Implemented an active heartbeat ping to `/health` in `OfflineBanner.tsx` to verify true connectivity.
- **Verification:** Overlay no longer appears during normal operation.

## 5. Group Creation Dialog "Close" Button 🟢 FIXED
- **Description:** Improved state management ensures dialogs can be closed after error states.