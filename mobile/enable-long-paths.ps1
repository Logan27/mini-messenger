# Enable Windows Long Path Support
# Run this script as Administrator

Write-Host "Enabling Windows Long Path Support..." -ForegroundColor Green

# Enable long paths in registry
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

Write-Host "Long path support enabled!" -ForegroundColor Green
Write-Host "Please restart your computer for changes to take effect." -ForegroundColor Yellow
