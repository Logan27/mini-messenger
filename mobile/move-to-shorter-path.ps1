# Move Project to Shorter Path to Fix Windows Path Length Issues
# This script helps move the entire messenger project to a shorter path

param(
    [string]$targetPath = "C:\msg"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Move Project to Shorter Path" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$currentPath = "C:\Users\anton\Documents\messenger"
$targetPath = $targetPath.TrimEnd('\')

Write-Host "Current path: $currentPath" -ForegroundColor Yellow
Write-Host "Target path:  $targetPath" -ForegroundColor Green
Write-Host ""

# Check if target exists
if (Test-Path $targetPath) {
    Write-Host "ERROR: Target path already exists!" -ForegroundColor Red
    Write-Host "Please choose a different path or delete the existing one." -ForegroundColor Red
    exit 1
}

# Confirm with user
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Copy entire project to $targetPath" -ForegroundColor White
Write-Host "  2. Preserve all files and permissions" -ForegroundColor White
Write-Host "  3. Keep original folder intact (you can delete it later)" -ForegroundColor White
Write-Host ""
Write-Host "Path length comparison:" -ForegroundColor Cyan
Write-Host "  Current mobile path: $($currentPath.Length + 7) characters ($currentPath\mobile)" -ForegroundColor White
Write-Host "  New mobile path:     $($targetPath.Length + 7) characters ($targetPath\mobile)" -ForegroundColor White
Write-Host "  Savings:             $($currentPath.Length - $targetPath.Length) characters" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Copying project..." -ForegroundColor Green
Write-Host "(This may take 2-5 minutes depending on node_modules size)" -ForegroundColor Yellow
Write-Host ""

try {
    # Use robocopy for efficient copying
    $robocopyArgs = @(
        $currentPath,
        $targetPath,
        '/E',           # Copy subdirectories including empty ones
        '/COPYALL',     # Copy all file information
        '/R:2',         # Retry 2 times on failed copies
        '/W:5',         # Wait 5 seconds between retries
        '/MT:8',        # Multi-threaded (8 threads)
        '/XD', 'node_modules\.cache',  # Exclude cache folders
        '/XD', '.gradle',
        '/XD', 'build',
        '/XD', '.cxx',
        '/NP',          # No progress (cleaner output)
        '/NDL',         # No directory list
        '/NFL'          # No file list
    )

    $result = & robocopy @robocopyArgs

    # Robocopy exit codes 0-7 are success
    if ($LASTEXITCODE -le 7) {
        Write-Host ""
        Write-Host "SUCCESS! Project copied to $targetPath" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Close all terminals and IDEs" -ForegroundColor White
        Write-Host "  2. Navigate to new location:" -ForegroundColor White
        Write-Host "     cd $targetPath\mobile" -ForegroundColor Yellow
        Write-Host "  3. Clean and rebuild:" -ForegroundColor White
        Write-Host "     cd android" -ForegroundColor Yellow
        Write-Host "     .\gradlew clean" -ForegroundColor Yellow
        Write-Host "     cd .." -ForegroundColor Yellow
        Write-Host "     npx expo run:android" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  4. After confirming it works, you can delete:" -ForegroundColor White
        Write-Host "     $currentPath" -ForegroundColor Yellow
        Write-Host ""
    } else {
        throw "Robocopy failed with exit code: $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to copy project!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "You can try manual copy:" -ForegroundColor Yellow
    Write-Host "  xcopy `"$currentPath`" `"$targetPath`" /E /I /H" -ForegroundColor White
    exit 1
}
