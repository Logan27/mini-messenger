Push-Location "C:\Users\anton\Documents\messenger\backend"
Get-Content "..\fix-contacts.sql" | docker-compose exec -T postgres psql -U messenger -d messenger
Pop-Location
Write-Host "`nContact relationships fixed! Both users should now see each other.`n" -ForegroundColor Green
