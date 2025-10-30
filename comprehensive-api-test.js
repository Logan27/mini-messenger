/**
 * Comprehensive API Test Suite
 * Tests all major endpoints after bug fixes
 * Date: October 20, 2025
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [],
};

let authToken = null;
let refreshToken = null;
let userId = null;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, status, duration, details = '') {
  const statusColor = status === 'PASS' ? colors.green : colors.red;
  const statusSymbol = status === 'PASS' ? '✓' : '✗';
  log(`${statusSymbol} ${name} (${duration}ms) ${details}`, statusColor);

  testResults.tests.push({ name, status, duration, details });
  testResults.total++;
  if (status === 'PASS') testResults.passed++;
  else testResults.failed++;
}

async function runTest(name, testFn) {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    logTest(name, 'PASS', duration, result?.message || '');
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error.response?.data?.error || error.message;
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logTest(name, 'FAIL', duration, errorDetails);
    // Don't throw - continue with other tests
    return null;
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  return runTest('Health Check', async () => {
    const response = await axios.get('http://localhost:4000/health');
    if (response.data.status !== 'healthy') {
      throw new Error(`Status: ${response.data.status}`);
    }
    return { message: `All services healthy` };
  });
}

// Test 2: User Registration
async function testRegistration() {
  return runTest('User Registration', async () => {
    const uniqueId = Date.now();
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      username: `testuser${uniqueId}`,
      email: `testuser${uniqueId}@test.com`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
    });

    if (!response.data.success) {
      throw new Error('Registration failed');
    }

    userId = response.data.data.user.id;
    return { message: `User ID: ${userId}` };
  });
}

// Test 3: User Login
async function testLogin() {
  return runTest('User Login', async () => {
    const uniqueId = Date.now();
    // First register a user
    await axios.post(`${BASE_URL}/auth/register`, {
      username: `loginuser${uniqueId}`,
      email: `loginuser${uniqueId}@test.com`,
      password: 'TestPass123!',
    });

    // Now login
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: `loginuser${uniqueId}@test.com`,
      password: 'TestPass123!',
    });

    if (!response.data.success) {
      throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
    }

    // Check both possible response structures
    if (response.data.data.tokens) {
      // New structure: data.tokens.accessToken
      authToken = response.data.data.tokens.accessToken;
      refreshToken = response.data.data.tokens.refreshToken;
    } else if (response.data.data.accessToken) {
      // Old structure: data.accessToken
      authToken = response.data.data.accessToken;
      refreshToken = response.data.data.refreshToken;
    } else {
      throw new Error(`No token in response: ${JSON.stringify(response.data)}`);
    }

    userId = response.data.data.user.id;

    return { message: `Token received` };
  });
}

// Test 4: Get Current User
async function testGetCurrentUser() {
  return runTest('Get Current User (GET /api/auth/me)', async () => {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.data.success || !response.data.data.user) {
      throw new Error('Failed to get current user');
    }

    return { message: `User: ${response.data.data.user.username}` };
  });
}

// Test 5: Token Refresh
async function testTokenRefresh() {
  return runTest('Token Refresh', async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available from login');
    }

    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    if (!response.data.success) {
      throw new Error(`Token refresh failed: ${JSON.stringify(response.data)}`);
    }

    // Check both possible response structures
    if (response.data.data.tokens) {
      authToken = response.data.data.tokens.accessToken;
    } else if (response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
    } else {
      throw new Error(`No access token in response: ${JSON.stringify(response.data)}`);
    }

    return { message: `New token received` };
  });
}

// Test 6: User Search
async function testUserSearch() {
  return runTest('User Search', async () => {
    const response = await axios.get(`${BASE_URL}/users/search`, {
      params: { query: 'test' },
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.data.success) {
      throw new Error('Search failed');
    }

    const resultCount = response.data.data.search.totalResults;
    return { message: `Found ${resultCount} users` };
  });
}

// Test 7: Get User Profile
async function testGetUserProfile() {
  return runTest('Get User Profile', async () => {
    const response = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.data.success) {
      throw new Error('Failed to get profile');
    }

    return { message: `Profile retrieved` };
  });
}

// Test 8: Update User Profile
async function testUpdateUserProfile() {
  return runTest('Update User Profile', async () => {
    const response = await axios.put(
      `${BASE_URL}/users/me`,
      {
        bio: 'Updated bio for testing',
        phone: '+1234567890',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error('Profile update failed');
    }

    return { message: `Profile updated` };
  });
}

// Test 9: Get Contacts
async function testGetContacts() {
  return runTest('Get Contacts', async () => {
    const response = await axios.get(`${BASE_URL}/contacts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.data.success) {
      throw new Error('Failed to get contacts');
    }

    // Handle different response structures
    const contacts = response.data.data?.contacts || response.data.data || [];
    return { message: `${contacts.length} contacts` };
  });
}

// Test 10: Get Conversations
async function testGetConversations() {
  return runTest('Get Conversations', async () => {
    const response = await axios.get(`${BASE_URL}/messages/conversations`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.data.success) {
      throw new Error('Failed to get conversations');
    }

    // Handle different response structures
    const conversations = response.data.data?.conversations || response.data.data || [];
    return { message: `${conversations.length} conversations` };
  });
}

// Test 11: Logout
async function testLogout() {
  return runTest('Logout', async () => {
    const response = await axios.post(
      `${BASE_URL}/auth/logout`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error('Logout failed');
    }

    return { message: `Logged out successfully` };
  });
}

function printSummary() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('TEST SUMMARY', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  const passRateColor = passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;

  log(`Total Tests: ${testResults.total}`, colors.blue);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, colors.red);
  log(`Pass Rate: ${passRate}%`, passRateColor);

  if (testResults.failed > 0) {
    log('\nFailed Tests:', colors.red);
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        log(`  ✗ ${t.name}: ${t.details}`, colors.red);
      });
  }

  log('\n' + '='.repeat(60), colors.cyan);

  const status = testResults.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';
  const statusColor = testResults.failed === 0 ? colors.green : colors.red;
  log(status, statusColor);
  log('='.repeat(60) + '\n', colors.cyan);
}

async function main() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('COMPREHENSIVE API TEST SUITE', colors.cyan);
  log('Testing Messenger Backend After Bug Fixes', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  try {
    // Run tests in sequence
    await testHealthCheck();
    await testRegistration();
    await testLogin();
    await testGetCurrentUser();
    await testTokenRefresh();
    await testUserSearch();
    await testGetUserProfile();
    await testUpdateUserProfile();
    await testGetContacts();
    await testGetConversations();
    await testLogout();

  } catch (error) {
    // Continue even if a test fails
  }

  printSummary();

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main();
