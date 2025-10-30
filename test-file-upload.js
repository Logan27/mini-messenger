/**
 * File Upload Test Script
 * Tests file upload functionality after Windows fix
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:4000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function createTestFile(filename, content) {
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const filepath = path.join(testDir, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
}

async function main() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('FILE UPLOAD TEST', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  let authToken = null;

  try {
    // Step 1: Register and login
    log('Step 1: Registering test user...', colors.yellow);
    const uniqueId = Date.now();
    await axios.post(`${BASE_URL}/auth/register`, {
      username: `fileuser${uniqueId}`,
      email: `fileuser${uniqueId}@test.com`,
      password: 'TestPass123!',
    });

    log('✓ User registered', colors.green);

    log('Step 2: Logging in...', colors.yellow);
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: `fileuser${uniqueId}@test.com`,
      password: 'TestPass123!',
    });

    authToken = loginResponse.data.data.tokens?.accessToken || loginResponse.data.data.accessToken;
    log('✓ Logged in successfully', colors.green);

    // Step 3: Create test files
    log('\nStep 3: Creating test files...', colors.yellow);
    const testFiles = {
      text: await createTestFile('test.txt', 'This is a test file for upload'),
      json: await createTestFile('test.json', JSON.stringify({ test: true, message: 'Upload test' }, null, 2)),
    };
    log('✓ Test files created', colors.green);

    // Step 4: Upload text file
    log('\nStep 4: Uploading text file...', colors.yellow);
    const textFormData = new FormData();
    textFormData.append('files', fs.createReadStream(testFiles.text));

    const textUploadResponse = await axios.post(`${BASE_URL}/files/upload`, textFormData, {
      headers: {
        ...textFormData.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (textUploadResponse.data.success) {
      log('✓ Text file uploaded successfully', colors.green);
      log(`  File ID: ${textUploadResponse.data.data.files[0].id}`, colors.cyan);
      log(`  Filename: ${textUploadResponse.data.data.files[0].filename}`, colors.cyan);
      log(`  Size: ${textUploadResponse.data.data.files[0].fileSize} bytes`, colors.cyan);
    } else {
      throw new Error('Upload failed: ' + JSON.stringify(textUploadResponse.data));
    }

    // Step 5: Upload JSON file
    log('\nStep 5: Uploading JSON file...', colors.yellow);
    const jsonFormData = new FormData();
    jsonFormData.append('files', fs.createReadStream(testFiles.json));

    const jsonUploadResponse = await axios.post(`${BASE_URL}/files/upload`, jsonFormData, {
      headers: {
        ...jsonFormData.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (jsonUploadResponse.data.success) {
      log('✓ JSON file uploaded successfully', colors.green);
      log(`  File ID: ${jsonUploadResponse.data.data.files[0].id}`, colors.cyan);
      log(`  Filename: ${jsonUploadResponse.data.data.files[0].filename}`, colors.cyan);
      log(`  Size: ${jsonUploadResponse.data.data.files[0].fileSize} bytes`, colors.cyan);
    } else {
      throw new Error('Upload failed: ' + JSON.stringify(jsonUploadResponse.data));
    }

    // Step 6: List uploaded files
    log('\nStep 6: Listing uploaded files...', colors.yellow);
    const listResponse = await axios.get(`${BASE_URL}/files`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (listResponse.data.success) {
      const fileCount = listResponse.data.data.files?.length || 0;
      log(`✓ Retrieved ${fileCount} files`, colors.green);
    }

    // Summary
    log('\n' + '='.repeat(60), colors.cyan);
    log('✅ ALL FILE UPLOAD TESTS PASSED', colors.green);
    log('='.repeat(60) + '\n', colors.cyan);

  } catch (error) {
    log('\n' + '='.repeat(60), colors.cyan);
    log('❌ TEST FAILED', colors.red);
    log('='.repeat(60), colors.cyan);

    if (error.response) {
      log(`\nStatus: ${error.response.status}`, colors.red);
      log(`Error: ${JSON.stringify(error.response.data, null, 2)}`, colors.red);
    } else {
      log(`\nError: ${error.message}`, colors.red);
    }

    process.exit(1);
  }
}

main();
