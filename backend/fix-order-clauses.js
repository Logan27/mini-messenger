import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, 'src', 'models');

const filesToFix = [
  'File.js',
  'Group.js',
  'GroupMessageStatus.js',
  'Message.js',
  'User.js'
];

filesToFix.forEach(filename => {
  const filePath = path.join(modelsDir, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace all order clauses with createdAt/updatedAt
  const originalContent = content;
  content = content.replace(/order:\s*\[\['createdAt',\s*'(DESC|ASC)'\]\]/g, "order: [['created_at', '$1']]");
  content = content.replace(/order:\s*\[\['updatedAt',\s*'(DESC|ASC)'\]\]/g, "order: [['updated_at', '$1']]");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${filename}`);
  } else {
    console.log(`✓  ${filename} - no changes needed`);
  }
});

console.log('✅ All model order clauses fixed!');
