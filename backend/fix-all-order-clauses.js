import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToFix = [
  'src/routes/users.js',
  'src/controllers/adminController.js',
  'src/routes/messages.js',
  'src/routes/files.js',
  'src/services/authService.js',
  'src/services/exportService.js',
  'src/controllers/userController.js',
  'src/controllers/announcementController.js'
];

filesToFix.forEach(relativePath => {
  const filePath = path.join(__dirname, relativePath);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relativePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace all order clauses with createdAt/updatedAt/lastUsedAt
  const originalContent = content;
  content = content.replace(/order:\s*\[\['createdAt',\s*'(DESC|ASC)'\]\]/g, "order: [['created_at', '$1']]");
  content = content.replace(/order:\s*\[\['updatedAt',\s*'(DESC|ASC)'\]\]/g, "order: [['updated_at', '$1']]");
  content = content.replace(/order:\s*\[\['lastUsedAt',\s*'(DESC|ASC)'\]\]/g, "order: [['last_used_at', '$1']]");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${relativePath}`);
  } else {
    console.log(`✓  ${relativePath} - no changes needed`);
  }
});

console.log('✅ All files fixed!');
