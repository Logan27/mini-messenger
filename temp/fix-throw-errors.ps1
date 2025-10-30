# Fix all throw errors in adminController
$filePath = "C:\Users\anton\Documents\messenger\backend\src\controllers\adminController.js"
$content = Get-Content $filePath -Raw

# Pattern to find and replace
$pattern = "      throw error;`r`n    }`r`n  }"
$replacement = @"
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }
"@

# Replace all occurrences
$newContent = $content.Replace($pattern, $replacement)

# Save back
Set-Content $filePath -Value $newContent -NoNewline

Write-Host "Fixed all throw errors in adminController" -ForegroundColor Green
