import fs from 'fs';
import path from 'path';

// Create test-files directory if it doesn't exist
const testDir = 'test-files';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Create a simple 1x1 PNG image (transparent pixel)
const pngData = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk start
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // Bit depth, color type, compression, filter, interlace
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk start
  0x54, 0x08, 0x99, 0x01, 0x01, 0x01, 0x00, 0x00, // Image data (compressed)
  0xFE, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // More data
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
  0xAE, 0x42, 0x60, 0x82 // CRC
]);

fs.writeFileSync(path.join(testDir, 'test-image.png'), pngData);
console.log('Created test-image.png');

// Create a simple PDF file (minimal valid PDF)
const pdfData = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');

fs.writeFileSync(path.join(testDir, 'test-document.pdf'), pdfData);
console.log('Created test-document.pdf');

// Create a test JSON file
const jsonData = JSON.stringify({
  test: true,
  message: "This is a test JSON file",
  timestamp: new Date().toISOString()
}, null, 2);

fs.writeFileSync(path.join(testDir, 'test-data.json'), jsonData);
console.log('Created test-data.json');

console.log('All test files created successfully!');