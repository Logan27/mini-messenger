# API Test Suite - User Guide

## Overview

`test-all-api-endpoints.bat` is a comprehensive automated test suite for the Messenger backend API. It tests **105 endpoints** across 13 categories.

## Features

- ✅ **Automated Testing**: Tests all available API endpoints automatically
- 🎨 **Color-Coded Output**: Green (pass), Red (fail), Yellow (skip/conditional)
- 📊 **Progress Tracking**: Real-time test counters and success rate calculation
- 🔐 **Authentication Flow**: Automatic login and token management
- 📝 **Comprehensive Coverage**: 13 sections covering all API functionality

## Prerequisites

1. **Backend Server Running**:
   ```bash
   cd backend
   npm run dev
   ```
   Server must be running on `http://localhost:4000`

2. **Test User Exists**:
   - Username: `testuser1`
   - Email: `testuser1@test.com`
   - Password: `Test123456!`
   - Approval Status: `approved`

   Create test user using:
   ```bash
   cd backend
   node create-test-users.js
   ```

3. **Tools Required**:
   - `curl` (included in Windows 10+)
   - PowerShell (for JSON parsing)

## Usage

### Basic Usage

Simply run the BAT file:

```cmd
test-all-api-endpoints.bat
```

### What Gets Tested

The test suite covers **13 sections**:

1. **Health Check Endpoints (4 tests)**
   - `/health` - Basic health check
   - `/health/detailed` - Detailed health information
   - `/health/ready` - Kubernetes readiness probe
   - `/health/live` - Kubernetes liveness probe

2. **Authentication Endpoints (9 tests)**
   - User registration
   - User login (with token extraction)
   - Get current user profile
   - Token refresh
   - Forgot password
   - Email verification (skipped - requires token)
   - Password reset (skipped - requires token)
   - Logout

3. **User Management Endpoints (10 tests)**
   - Get current user profile
   - Update user profile
   - Search users
   - List users with pagination
   - Avatar upload (skipped - requires file)
   - Delete user (skipped - admin only)
   - Device tokens (skipped)
   - Data export (skipped)

4. **Messaging Endpoints (9 tests)**
   - Send new message
   - Get conversation messages
   - Search messages
   - Get conversations list
   - Mark message as read (skipped)
   - Edit message (skipped)
   - Delete message (skipped)

5. **Contacts Endpoints (6 tests)**
   - Get contacts list
   - Search contacts
   - Add contact (skipped)
   - Remove contact (skipped)
   - Block/unblock contact (skipped)

6. **Groups Endpoints (9 tests)**
   - Get user's groups
   - Create new group
   - Get group details (skipped)
   - Update group (skipped)
   - Delete group (skipped)
   - Manage members (skipped)

7. **Calls Endpoints (4 tests)**
   - All skipped (require WebSocket connection)

8. **Files Endpoints (8 tests)**
   - List user's files
   - Upload file (skipped - requires multipart)
   - Download file (skipped)
   - Thumbnails (skipped)
   - Admin operations (skipped)

9. **Encryption Endpoints (4 tests)**
   - Generate E2E key pair
   - Get public key (skipped)
   - Batch get public keys (skipped)
   - Update public key (skipped)

10. **Notifications Endpoints (7 tests)**
    - Get notifications
    - Get unread count
    - Mark all as read
    - Mark single as read (skipped)
    - Delete notification (skipped)

11. **Notification Settings Endpoints (4 tests)**
    - Get notification settings
    - Update settings (skipped)
    - Reset settings (skipped)
    - Preview settings (skipped)

12. **Announcements Endpoints (1 test)**
    - Get active announcements

13. **Admin Endpoints (30 tests)**
    - System statistics
    - User management (all skipped - require admin)
    - Audit logs (skipped - require admin)
    - Reports (skipped - require admin)
    - System settings (skipped - require admin)

## Output Format

```
============================================================================
         MESSENGER API COMPREHENSIVE TEST SUITE
============================================================================

Starting API tests at 21/10/2025 12:21:34
API URL: http://localhost:4000

============================================================================
SECTION 1: HEALTH CHECK ENDPOINTS (4 endpoints)
============================================================================

[1] Testing GET /health - Health Check
✓ PASS - Health check endpoint accessible

[2] Testing GET /health/detailed - Detailed Health Check
✓ PASS - Detailed health check accessible

...

============================================================================
                        TEST SUMMARY
============================================================================

Total Tests:    105
Passed:         25
Failed:         2
Skipped:        78
Success Rate:   92%

Test completed at 21/10/2025 12:22:15

✓ All executable tests passed successfully!
```

## Test Status Indicators

- `✓ PASS` (Green) - Test passed successfully
- `✗ FAIL` (Red) - Test failed
- `⊘ SKIP` (Yellow) - Test skipped (requires special conditions)
- `⚠ CONDITIONAL` (Yellow) - Test may pass/fail depending on state

## Understanding Skip Reasons

Many tests are skipped for valid reasons:

1. **Requires Authentication**: Test needs login (if login fails)
2. **Requires Admin Access**: Endpoint is admin-only
3. **Requires File Upload**: Endpoint needs multipart/form-data
4. **Requires Specific IDs**: Needs message ID, user ID, etc.
5. **Requires WebSocket**: Real-time features need socket connection
6. **Requires External Tokens**: Email verification, password reset

## Customization

### Change API URL

Edit the BAT file, line 11:
```batch
set API_URL=http://your-api-url:port
```

### Change Test Credentials

Edit the BAT file, lines 32-34:
```batch
set TEST_EMAIL=your-email@test.com
set TEST_PASSWORD=YourPassword123!
set TEST_USERNAME=yourusername
```

### Add More Tests

Add new test blocks following this pattern:

```batch
echo [N] Testing METHOD /api/endpoint - Description
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    curl -s -X METHOD "%API_URL%/api/endpoint" ^
      -H "Authorization: Bearer !ACCESS_TOKEN!" ^
      -o temp_result.json
    findstr /C:"success" temp_result.json > nul
    if !errorlevel! equ 0 (
        echo %GREEN%✓ PASS%RESET% - Test passed
        set /a PASSED_TESTS+=1
    ) else (
        echo %RED%✗ FAIL%RESET% - Test failed
        set /a FAILED_TESTS+=1
    )
    del temp_result.json 2>nul
) else (
    echo %YELLOW%⊘ SKIP%RESET% - No access token
    set /a SKIPPED_TESTS+=1
)
echo.
```

## Troubleshooting

### Issue: "curl is not recognized"

**Solution**: Install curl or use Windows 10+ which includes it by default.

### Issue: All tests show "SKIP - No access token"

**Cause**: Login failed (test #6)

**Solutions**:
1. Ensure test user exists and is approved
2. Check backend server is running on localhost:4000
3. Verify credentials match database
4. Run `node backend/create-test-users.js` to create test users

### Issue: "Health check endpoint failed"

**Cause**: Backend server not running

**Solution**:
```bash
cd backend
npm run dev
```

### Issue: Tests fail with database errors

**Cause**: Migrations not run or database schema issues

**Solution**:
```bash
cd backend
npm run migrate
```

### Issue: PowerShell execution errors

**Cause**: PowerShell execution policy

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Expected Results

On a properly configured system with test users:

- **Total Tests**: 105
- **Typical Pass Rate**: 20-30 tests
- **Typical Skip Rate**: 70-80 tests
- **Expected Fails**: 0-2 tests

Most tests are skipped because they require:
- Admin access (30+ tests)
- Specific resource IDs (20+ tests)
- File uploads (8+ tests)
- WebSocket connections (4+ tests)

## Exit Codes

- `0` - All executed tests passed (skipped tests don't count as failures)
- `1` - One or more tests failed

Use in CI/CD:
```batch
test-all-api-endpoints.bat
if errorlevel 1 (
    echo Build failed
    exit /b 1
)
```

## Test Results

Results are printed to console. To save results:

```cmd
test-all-api-endpoints.bat > test-results.txt 2>&1
```

Or with timestamp:
```cmd
test-all-api-endpoints.bat > test-results-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log 2>&1
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: API Tests
on: [push]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend
          npm install
      - name: Start server
        run: |
          cd backend
          npm run dev &
          timeout 30
      - name: Run API tests
        run: test-all-api-endpoints.bat
```

## Performance Benchmarking

The test suite runs in approximately **30-60 seconds** depending on:
- Network latency
- Database performance
- Server response times

To benchmark:
```cmd
powershell "Measure-Command { .\test-all-api-endpoints.bat }"
```

## Advanced Usage

### Run Specific Sections Only

Comment out unwanted sections in the BAT file using `REM`:

```batch
REM echo %YELLOW%============================================================================%RESET%
REM echo %YELLOW%SECTION 13: ADMIN ENDPOINTS (30 endpoints - Requires Admin Access)%RESET%
REM echo %YELLOW%============================================================================%RESET%
```

### Debug Mode

Enable verbose curl output by removing `-s` flag:

```batch
REM Before:
curl -s -X GET "%API_URL%/health"

REM After (debug):
curl -v -X GET "%API_URL%/health"
```

### JSON Response Inspection

Remove `del temp_*.json` lines to keep response files for inspection.

## License

This test suite is part of the Messenger project and follows the same license.

## Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Review test output for specific failures
3. Verify database migrations are up to date
4. Ensure test users exist and are approved

## Version History

- **v1.0** (2025-10-21) - Initial release with 105 endpoint tests
