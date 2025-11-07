// Check if Firebase is properly configured
// Run with: node backend/check-firebase-setup.js

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Checking Firebase Configuration...\n');

let hasConfig = false;

// Check Option A: Service Account File
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (serviceAccountPath) {
  const fullPath = path.resolve(__dirname, serviceAccountPath);
  console.log('📁 Option A: Service Account File');
  console.log(`   Path: ${serviceAccountPath}`);

  if (fs.existsSync(fullPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log('   ✅ File exists and is valid JSON');
      console.log(`   Project ID: ${serviceAccount.project_id}`);
      console.log(`   Client Email: ${serviceAccount.client_email}`);
      console.log(`   Private Key: ${serviceAccount.private_key ? '✅ Present' : '❌ Missing'}`);
      hasConfig = true;
    } catch (error) {
      console.log(`   ❌ File exists but is invalid: ${error.message}`);
    }
  } else {
    console.log(`   ❌ File not found at: ${fullPath}`);
  }
  console.log('');
}

// Check Option B: Environment Variables
console.log('📝 Option B: Environment Variables');
const envProjectId = process.env.FIREBASE_PROJECT_ID;
const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (envProjectId || envClientEmail || envPrivateKey) {
  console.log(`   Project ID: ${envProjectId ? '✅ ' + envProjectId : '❌ Missing'}`);
  console.log(`   Client Email: ${envClientEmail ? '✅ ' + envClientEmail : '❌ Missing'}`);
  console.log(`   Private Key: ${envPrivateKey ? '✅ Present' : '❌ Missing'}`);

  if (envProjectId && envClientEmail && envPrivateKey) {
    hasConfig = true;
  }
} else {
  console.log('   ⚠️  No environment variables set');
}
console.log('');

// Final verdict
console.log('📊 Status:');
if (hasConfig) {
  console.log('   ✅ Firebase is properly configured!');
  console.log('   🚀 Push notifications should work.');
} else {
  console.log('   ❌ Firebase is NOT configured.');
  console.log('   ⚠️  Push notifications will NOT work.');
  console.log('');
  console.log('📖 Setup Instructions:');
  console.log('   1. Read FIREBASE_SETUP.md for detailed instructions');
  console.log('   2. Get credentials from Firebase Console');
  console.log('   3. Choose one option:');
  console.log('      Option A: Download service account JSON and save as backend/firebase-service-account.json');
  console.log('      Option B: Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to .env');
  console.log('   4. Run this script again to verify');
}
console.log('');
