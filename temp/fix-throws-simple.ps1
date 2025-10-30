$file = "C:\Users\anton\Documents\messenger\backend\src\controllers\adminController.js"
$content = Get-Content $file -Raw

# Simple replacement
$content = $content -replace "throw error;", "return res.status(500).json({ success: false, error: { type: 'INTERNAL_ERROR', message: 'Operation failed', debug: process.env.NODE_ENV === 'development' ? error.message : undefined } });"

Set-Content $file -Value $content -NoNewline
Write-Host "Done"
