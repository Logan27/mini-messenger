/**
 * API Test Runner for Messenger Application
 * 
 * This script automates the execution of API tests based on the testing plan.
 * It runs tests in the specified order and logs results for analysis.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseURL: 'http://localhost:4000/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  resultsDir: './test-results',
  logLevel: 'info' // 'debug', 'info', 'warn', 'error'
};

// Test data
const testData = {
  users: {
    admin: {
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'TestAdmin123!',
      firstName: 'Test',
      lastName: 'Admin'
    },
    regular: [
      {
        username: 'testuser1',
        email: 'user1@test.com',
        password: 'TestUser123!',
        firstName: 'Test',
        lastName: 'User1'
      },
      {
        username: 'testuser2',
        email: 'user2@test.com',
        password: 'TestUser123!',
        firstName: 'Test',
        lastName: 'User2'
      },
      {
        username: 'testuser3',
        email: 'user3@test.com',
        password: 'TestUser123!',
        firstName: 'Test',
        lastName: 'User3'
      }
    ],
    pending: {
      username: 'pendinguser',
      email: 'pending@test.com',
      password: 'TestPending123!',
      firstName: 'Pending',
      lastName: 'User'
    }
  },
  groups: {
    private: {
      name: 'Test Private Group',
      description: 'A private group for testing',
      groupType: 'private'
    },
    public: {
      name: 'Test Public Group',
      description: 'A public group for testing',
      groupType: 'public'
    }
  },
  messages: {
    simple: 'Hello, this is a test message',
    long: 'This is a very long message that exceeds the normal length to test the system\'s ability to handle longer messages. '.repeat(10),
    special: 'Message with special chars: 🎉 ñáéíóú 漢字 🚀',
    metadata: {
      location: { lat: 40.7128, lng: -74.0060 },
      custom: { type: 'test', priority: 'high' }
    }
  }
};

// Test state
let testState = {
  tokens: {},
  users: {},
  groups: {},
  messages: {},
  files: {},
  contacts: {},
  results: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

// Utility functions
const logger = {
  debug: (message, data = null) => {
    if (config.logLevel === 'debug') {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },
  info: (message, data = null) => {
    if (['debug', 'info'].includes(config.logLevel)) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  warn: (message, data = null) => {
    if (['debug', 'info', 'warn'].includes(config.logLevel)) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  error: (message, data = null) => {
    console.error(`[ERROR] ${message}`, data || '');
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (method, endpoint, data = null, headers = {}, useToken = true) => {
  const url = `${config.baseURL}${endpoint}`;
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Add authentication token if available
  if (useToken && testState.tokens.default) {
    requestHeaders.Authorization = `Bearer ${testState.tokens.default}`;
  }

  const requestConfig = {
    method,
    url,
    headers: requestHeaders,
    timeout: config.timeout,
    validateStatus: () => true // Don't throw on status codes
  };

  if (data && (method === 'post' || method === 'put' || method === 'patch')) {
    requestConfig.data = data;
  }

  let lastError;
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const response = await axios(requestConfig);
      logger.debug(`${method.toUpperCase()} ${endpoint} - Attempt ${attempt}/${config.retryAttempts}`, {
        status: response.status,
        data: response.data
      });
      return response;
    } catch (error) {
      lastError = error;
      logger.warn(`${method.toUpperCase()} ${endpoint} - Attempt ${attempt}/${config.retryAttempts} failed`, {
        error: error.message
      });
      if (attempt < config.retryAttempts) {
        await delay(config.retryDelay);
      }
    }
  }

  throw lastError;
};

const runTest = async (name, testFunction) => {
  const startTime = Date.now();
  testState.results.total++;
  
  try {
    logger.info(`Running test: ${name}`);
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    testState.results.passed++;
    logger.info(`✅ ${name} - PASSED (${duration}ms)`);
    
    return {
      name,
      status: 'passed',
      duration,
      result
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    testState.results.failed++;
    testState.results.errors.push({
      test: name,
      error: error.message,
      stack: error.stack
    });
    
    logger.error(`❌ ${name} - FAILED (${duration}ms)`, {
      error: error.message,
      stack: error.stack
    });
    
    return {
      name,
      status: 'failed',
      duration,
      error: error.message,
      stack: error.stack
    };
  }
};

// Test suites
const healthTests = () => {
  return runTest('Health Check', async () => {
    // Health endpoint is at root level, not under /api
    const response = await axios.get('http://localhost:4000/health', {
      timeout: config.timeout,
      validateStatus: () => true
    });
    
    if (response.status !== 200 && response.status !== 503) {
      throw new Error(`Expected status 200 or 503, got ${response.status}`);
    }
    if (!response.data.status) {
      throw new Error('Health check response missing status');
    }
    return response.data;
  });
};

const authTests = () => {
  const tests = [];
  
  // Test user registration
  tests.push(runTest('User Registration', async () => {
    const response = await makeRequest('post', '/auth/register', testData.users.admin, {}, false);
    if (response.status !== 201 && response.status !== 409) {
      throw new Error(`Expected status 201 or 409, got ${response.status}`);
    }
    
    // Store user data if registration successful
    if (response.status === 201) {
      testState.users.admin = response.data.data;
    }
    
    return response.data;
  }));
  
  // Test user login
  tests.push(runTest('User Login', async () => {
    const response = await makeRequest('post', '/auth/login', {
      identifier: testData.users.admin.email,
      password: testData.users.admin.password
    }, {}, false);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.data?.tokens?.accessToken) {
      throw new Error('Login response missing accessToken token');
    }
    
    // Store token for subsequent requests
    testState.tokens.default = response.data.data.tokens.accessToken;
    testState.tokens.refresh = response.data.data.tokens.refreshToken;
    
    return response.data;
  }));
  
  // Test getting current user profile
  tests.push(runTest('Get Current User Profile', async () => {
    const response = await makeRequest('get', '/auth/me');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    if (!response.data.data) {
      throw new Error('Profile response missing user data');
    }
    return response.data;
  }));
  
  // Test token refresh
  tests.push(runTest('Token Refresh', async () => {
    const response = await makeRequest('post', '/auth/refresh', {
      refreshToken: testState.tokens.refresh
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    return response.data;
  }));
  
  return Promise.all(tests);
};

const userTests = () => {
  const tests = [];
  
  // Test updating user profile
  tests.push(runTest('Update User Profile', async () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Admin',
      status: 'online'
    };
    
    const response = await makeRequest('put', '/users/me', updateData);
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Test user search
  tests.push(runTest('User Search', async () => {
    const response = await makeRequest('get', '/users/search?query=test&page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Test listing users
  tests.push(runTest('List Users', async () => {
    const response = await makeRequest('get', '/users?page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  return Promise.all(tests);
};

const messageTests = () => {
  const tests = [];
  
  // Test sending a direct message
  tests.push(runTest('Send Direct Message', async () => {
    // First create a test user to message
    const userResponse = await makeRequest('post', '/auth/register', testData.users.regular[0], {}, false);
    if (userResponse.status === 201) {
      testState.users.user1 = userResponse.data.data;
    }
    
    const messageData = {
      content: testData.messages.simple,
      recipientId: testState.users.user1?.id || 'test-user-id'
    };
    
    const response = await makeRequest('post', '/messages', messageData);
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    if (response.data.data) {
      testState.messages.direct = response.data.data;
    }
    
    return response.data;
  }));
  
  // Test getting message history
  tests.push(runTest('Get Message History', async () => {
    const response = await makeRequest('get', '/messages?conversationWith=test-user-id&page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Test message search
  tests.push(runTest('Search Messages', async () => {
    const response = await makeRequest('get', '/messages/search?q=test&page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  return Promise.all(tests);
};

const groupTests = () => {
  const tests = [];
  
  // Test creating a group
  tests.push(runTest('Create Group', async () => {
    const response = await makeRequest('post', '/groups', testData.groups.private);
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    if (response.data.data) {
      testState.groups.private = response.data.data;
    }
    
    return response.data;
  }));
  
  // Test getting user groups
  tests.push(runTest('Get User Groups', async () => {
    const response = await makeRequest('get', '/groups?page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Test getting group details
  tests.push(runTest('Get Group Details', async () => {
    if (!testState.groups.private?.id) {
      throw new Error('No group ID available for testing');
    }
    
    const response = await makeRequest('get', `/groups/${testState.groups.private.id}`);
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  return Promise.all(tests);
};

const fileTests = () => {
  const tests = [];
  
  // Test listing files
  tests.push(runTest('List User Files', async () => {
    const response = await makeRequest('get', '/files?page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Note: File upload tests would require actual files and multipart form data
  // This would need additional implementation for proper testing
  
  return Promise.all(tests);
};

const contactTests = () => {
  const tests = [];
  
  // Test getting contacts
  tests.push(runTest('Get Contacts', async () => {
    const response = await makeRequest('get', '/contacts?page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Test adding a contact
  tests.push(runTest('Add Contact', async () => {
    if (!testState.users.user1?.id) {
      throw new Error('No user ID available for adding as contact');
    }
    
    const contactData = {
      userId: testState.users.user1.id,
      nickname: 'Test Contact',
      notes: 'Added during API testing'
    };
    
    const response = await makeRequest('post', '/contacts', contactData);
    if (response.status !== 201 && response.status !== 409) {
      throw new Error(`Expected status 201 or 409, got ${response.status}`);
    }
    
    if (response.data.data) {
      testState.contacts.test = response.data.data;
    }
    
    return response.data;
  }));
  
  return Promise.all(tests);
};

const notificationTests = () => {
  const tests = [];
  
  // Test getting notifications
  tests.push(runTest('Get Notifications', async () => {
    const response = await makeRequest('get', '/notifications?page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Test getting unread count
  tests.push(runTest('Get Unread Count', async () => {
    const response = await makeRequest('get', '/notifications/unread-count');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  return Promise.all(tests);
};

const adminTests = () => {
  const tests = [];
  
  // Test getting system stats (admin only)
  tests.push(runTest('Get System Stats', async () => {
    const response = await makeRequest('get', '/admin/stats');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  // Test getting pending users (admin only)
  tests.push(runTest('Get Pending Users', async () => {
    const response = await makeRequest('get', '/admin/users/pending?page=1&limit=10');
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    return response.data;
  }));
  
  return Promise.all(tests);
};

// Main execution function
const runAllTests = async () => {
  console.log('🚀 Starting API Test Execution\n');
  
  // Create results directory
  if (!fs.existsSync(config.resultsDir)) {
    fs.mkdirSync(config.resultsDir, { recursive: true });
  }
  
  const startTime = Date.now();
  const testResults = {
    startTime: new Date().toISOString(),
    config,
    results: []
  };
  
  try {
    // Phase 1: Health and Authentication
    console.log('📋 Phase 1: Health Check and Authentication');
    testResults.results.push(await healthTests());
    await authTests();
    
    // Phase 2: User Management
    console.log('\n📋 Phase 2: User Management');
    await userTests();
    
    // Phase 3: Core Features
    console.log('\n📋 Phase 3: Core Features');
    await messageTests();
    await groupTests();
    await contactTests();
    
    // Phase 4: Additional Features
    console.log('\n📋 Phase 4: Additional Features');
    await fileTests();
    await notificationTests();
    
    // Phase 5: Admin Functions
    console.log('\n📋 Phase 5: Admin Functions');
    await adminTests();
    
  } catch (error) {
    logger.error('Test execution failed', error);
  }
  
  const duration = Date.now() - startTime;
  testResults.endTime = new Date().toISOString();
  testResults.duration = duration;
  testResults.summary = testState.results;
  
  // Save results to file
  const resultsFile = path.join(config.resultsDir, `api-test-results-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
  
  // Print summary
  console.log('\n📊 Test Execution Summary');
  console.log('========================');
  console.log(`Total Tests: ${testState.results.total}`);
  console.log(`Passed: ${testState.results.passed}`);
  console.log(`Failed: ${testState.results.failed}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Results saved to: ${resultsFile}`);
  
  if (testState.results.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testState.results.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n✅ Test execution completed!');
  
  return testResults;
};

// Export for use as module
if (require.main === module) {
  // Run tests if this file is executed directly
  runAllTests().catch(error => {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  healthTests,
  authTests,
  userTests,
  messageTests,
  groupTests,
  fileTests,
  contactTests,
  notificationTests,
  adminTests,
  config,
  testData,
  testState
};