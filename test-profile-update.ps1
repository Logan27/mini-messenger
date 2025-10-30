# Test profile update with .local email domain
# Usage: .\test-profile-update.ps1

$apiUrl = "http://localhost:4000"

Write-Host "`n=== Testing Profile Update with .local Email ===" -ForegroundColor Cyan

# Step 1: Login as admin
Write-Host "`n1. Logging in as admin..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "$apiUrl/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        identifier = "admin@messenger.local"
        password = "Admin@123"
    } | ConvertTo-Json)

if ($loginResponse.success) {
    $token = $loginResponse.data.accessToken
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "User: $($loginResponse.data.user.username) ($($loginResponse.data.user.email))" -ForegroundColor Gray
} else {
    Write-Host "✗ Login failed: $($loginResponse.error)" -ForegroundColor Red
    exit 1
}

# Step 2: Update profile with the same email (should work now)
Write-Host "`n2. Updating profile with email: admin@messenger.local..." -ForegroundColor Yellow

try {
    $updateResponse = Invoke-RestMethod -Uri "$apiUrl/api/users/me" `
        -Method PUT `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token" } `
        -Body (@{
            firstName = "Admin"
            lastName = "User"
            bio = "System Administrator"
            email = "admin@messenger.local"
        } | ConvertTo-Json)

    if ($updateResponse.success) {
        Write-Host "✓ Profile updated successfully!" -ForegroundColor Green
        Write-Host "`nUpdated profile:" -ForegroundColor Cyan
        Write-Host "  Username: $($updateResponse.data.username)" -ForegroundColor Gray
        Write-Host "  Email: $($updateResponse.data.email)" -ForegroundColor Gray
        Write-Host "  First Name: $($updateResponse.data.firstName)" -ForegroundColor Gray
        Write-Host "  Last Name: $($updateResponse.data.lastName)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Update failed: $($updateResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Request failed: $($errorDetails.error)" -ForegroundColor Red
    exit 1
}

# Step 3: Test with another .local email
Write-Host "`n3. Testing with different .local email..." -ForegroundColor Yellow

try {
    $updateResponse2 = Invoke-RestMethod -Uri "$apiUrl/api/users/me" `
        -Method PUT `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token" } `
        -Body (@{
            email = "test@example.local"
            currentPassword = "Admin@123"
        } | ConvertTo-Json)

    if ($updateResponse2.success) {
        Write-Host "✓ Email updated to test@example.local" -ForegroundColor Green
    } else {
        Write-Host "✗ Update failed: $($updateResponse2.error)" -ForegroundColor Red
    }
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Request failed: $($errorDetails.error)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
