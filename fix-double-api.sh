#!/bin/bash
# Fix double /api paths in frontend files

# Admin pages
FILES=(
  "frontend/src/pages/admin/Users.tsx"
  "frontend/src/pages/admin/AuditLogs.tsx"
  "frontend/src/pages/admin/Settings.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Replace VITE_API_URL default value
    sed -i "s|'http://localhost:4000'|'http://localhost:4000/api'|g" "$file"
    # Remove /api/ prefix from paths
    sed -i "s|\${apiUrl}/api/|${apiUrl}/|g" "$file"
    # Fix response.data to response.data.data for nested data
    sed -i "s|response\.data\.users|response.data.data.users|g" "$file"
    sed -i "s|response\.data\.settings|response.data.data.settings|g" "$file"
    echo "✓ Fixed $file"
  else
    echo "✗ File not found: $file"
  fi
done

echo "Done!"
