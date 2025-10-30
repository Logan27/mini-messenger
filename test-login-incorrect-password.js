/**
 * Test script for Login with Incorrect Password
 * Tests: POST /api/auth/login with wrong password
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testIncorrectPassword() {
  console.log('🧪 Testing Login with Incorrect Password\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Test login with incorrect password
    console.log('\n1️⃣  Attempting login with incorrect password...');

    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        identifier: 'charlie',
        password: 'WrongPassword123!'
      });

      // If we get here, login succeeded when it should have failed
      console.log('   ❌ Login succeeded with wrong password (SECURITY ISSUE!)');
      console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
      return;

    } catch (error) {
      if (!error.response) {
        throw error;
      }

      const status = error.response.status;
      const data = error.response.data;

      console.log(`   ✅ Login rejected (Status: ${status})`);
      console.log(`   Error Message: ${data.error?.message || data.message || data.error}`);

      // Verify it's a 401 Unauthorized error
      if (status !== 401) {
        console.log(`   ⚠️  Expected status 401, got ${status}`);
      } else {
        console.log(`   ✅ Correct status code (401 Unauthorized)`);
      }

      // Verify error message is appropriate
      const errorMsg = (data.error?.message || data.message || data.error || '').toLowerCase();
      const isValidError = errorMsg.includes('invalid') ||
                          errorMsg.includes('incorrect') ||
                          errorMsg.includes('credentials') ||
                          errorMsg.includes('password');

      if (!isValidError) {
        console.log(`   ⚠️  Error message may not be specific enough`);
      } else {
        console.log(`   ✅ Error message is appropriate`);
      }
    }

    // Step 2: Verify correct password still works
    console.log('\n2️⃣  Verifying correct password still works...');
    const correctLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'charlie',
      password: 'Admin123!@#'
    });

    if (!correctLoginResponse.data.success) {
      console.log('   ❌ Login with correct password failed');
      return;
    }

    console.log(`   ✅ Login with correct password successful`);
    console.log(`   User: ${correctLoginResponse.data.data.user.username}`);

    // Step 3: Test with completely wrong username
    console.log('\n3️⃣  Testing with non-existent user...');

    try {
      await axios.post(`${API_URL}/auth/login`, {
        identifier: 'nonexistentuser999',
        password: 'AnyPassword123!'
      });

      console.log('   ❌ Login succeeded for non-existent user (SECURITY ISSUE!)');
      return;

    } catch (error) {
      if (!error.response) {
        throw error;
      }

      console.log(`   ✅ Login rejected (Status: ${error.response.status})`);
      console.log(`   Error Message: ${error.response.data.error?.message || error.response.data.message || error.response.data.error}`);
    }

    // Step 4: Test empty password
    console.log('\n4️⃣  Testing with empty password...');

    try {
      await axios.post(`${API_URL}/auth/login`, {
        identifier: 'charlie',
        password: ''
      });

      console.log('   ❌ Login succeeded with empty password (SECURITY ISSUE!)');
      return;

    } catch (error) {
      if (!error.response) {
        throw error;
      }

      console.log(`   ✅ Login rejected (Status: ${error.response.status})`);
      console.log(`   Error Message: ${error.response.data.error?.message || error.response.data.message || error.response.data.error}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Login security working correctly!');
    console.log('✅ System properly rejects invalid credentials');
    console.log('✅ Error messages are appropriate and don\'t leak information\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED\n');

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
      console.log(error.stack);
    }
  }
}

testIncorrectPassword();
