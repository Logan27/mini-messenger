const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:4000';
const API_BASE = `${BASE_URL}/api`;

// JWT token from fresh authentication
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NTBhYWEwMS05NjNhLTQwZDUtOTk4ZC02MWVlNWFlZjM0N2YiLCJ1c2VybmFtZSI6InRlc3R1c2VyMTc2MDk1NzIwMCIsImVtYWlsIjoidGVzdHVzZXIxNzYwOTU3MjAwQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjA5NzQ3NDQsImV4cCI6MTc2MTU3OTU0NCwiYXVkIjoibWVzc2VuZ2VyLXVzZXJzIiwiaXNzIjoibWVzc2VuZ2VyLWJhY2tlbmQiLCJzdWIiOiI3NTBhYWEwMS05NjNhLTQwZDUtOTk4ZC02MWVlNWFlZjM0N2YifQ.lAjDQjq5YkD71xXWfNYspB5b3ORmnwhC2vWNn--SH0Q';

// Create axios instance with authentication
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test results storage
const testResults = {
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: 0
  },
  endpoints: {}
};

// Helper function to log test results
function logTestResult(endpoint, method, status, expectedStatus, response, error = null) {
  const testKey = `${method} ${endpoint}`;
  const success = status === expectedStatus;
  
  testResults.summary.totalTests++;
  if (success) {
    testResults.summary.passed++;
  } else if (error) {
    testResults.summary.errors++;
  } else {
    testResults.summary.failed++;
  }
  
  testResults.endpoints[testKey] = {
    method,
    endpoint,
    expectedStatus,
    actualStatus: status,
    success,
    response: success ? response.data : null,
    error: error ? error.message : (response.data ? response.data : null),
    timestamp: new Date().toISOString()
  };
  
  console.log(`\n${success ? '✅' : '❌'} ${method} ${endpoint}`);
  console.log(`Expected: ${expectedStatus}, Actual: ${status}`);
  if (error) {
    console.log(`Error: ${error.message}`);
  } else if (!success && response.data) {
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
  }
}

// Test user profile endpoints
async function testUserEndpoints() {
  console.log('\n🔍 Testing User Profile Endpoints');
  
  try {
    // GET /api/users/me - Get current user profile
    try {
      const response = await api.get('/users/me');
      logTestResult('/users/me', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/users/me', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // PUT /api/users/me - Update user profile
    try {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        bio: 'Test user bio updated',
        phone: '+1234567890'
      };
      const response = await api.put('/users/me', updateData);
      logTestResult('/users/me', 'PUT', response.status, 200, response);
    } catch (error) {
      logTestResult('/users/me', 'PUT', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // GET /api/users/search - Search for users
    try {
      const response = await api.get('/users/search?q=test');
      logTestResult('/users/search', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/users/search', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // POST /api/users/me/avatar - Upload user avatar (skip for now - requires multipart)
    console.log('\n⚠️  Skipping avatar upload test - requires multipart form data');
    
  } catch (error) {
    console.error('Error in user endpoints test:', error.message);
  }
}

// Test contacts endpoints
async function testContactsEndpoints() {
  console.log('\n👥 Testing Contacts Endpoints');
  
  try {
    // GET /api/contacts - Get contacts list
    try {
      const response = await api.get('/contacts');
      logTestResult('/contacts', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/contacts', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // POST /api/contacts - Add a new contact (first create a test user)
    let testUserId = null;
    try {
      // First search for a user to add as contact
      const searchResponse = await api.get('/users/search?q=user');
      if (searchResponse.data.success && searchResponse.data.data.users.length > 0) {
        testUserId = searchResponse.data.data.users[0].id;
        
        const addContactData = {
          userId: testUserId,
          nickname: 'Test Contact'
        };
        const response = await api.post('/contacts', addContactData);
        logTestResult('/contacts', 'POST', response.status, 201, response);
      } else {
        console.log('⚠️  No users found to add as contact');
      }
    } catch (error) {
      logTestResult('/contacts', 'POST', error.response?.status || 500, 201, error.response || {}, error);
    }
    
    // GET /api/contacts/search - Search contacts
    try {
      const response = await api.get('/contacts/search?q=test');
      logTestResult('/contacts/search', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/contacts/search', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // PUT /api/contacts/{id}/nickname - Update contact nickname (if we have a contact)
    if (testUserId) {
      try {
        const response = await api.put(`/contacts/${testUserId}/nickname`, {
          nickname: 'Updated Nickname'
        });
        logTestResult(`/contacts/${testUserId}/nickname`, 'PUT', response.status, 200, response);
      } catch (error) {
        logTestResult(`/contacts/${testUserId}/nickname`, 'PUT', error.response?.status || 500, 200, error.response || {}, error);
      }
    }
    
  } catch (error) {
    console.error('Error in contacts endpoints test:', error.message);
  }
}

// Test messaging endpoints
async function testMessagingEndpoints() {
  console.log('\n💬 Testing Messaging Endpoints');
  
  try {
    // GET /api/messages - Get messages with pagination
    try {
      const response = await api.get('/messages?page=1&limit=10');
      logTestResult('/messages', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/messages', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // POST /api/messages - Send a new message
    let messageId = null;
    try {
      const messageData = {
        content: 'Test message from API testing',
        type: 'text'
      };
      const response = await api.post('/messages', messageData);
      messageId = response.data.data?.message?.id;
      logTestResult('/messages', 'POST', response.status, 201, response);
    } catch (error) {
      logTestResult('/messages', 'POST', error.response?.status || 500, 201, error.response || {}, error);
    }
    
    // GET /api/messages/conversations - Get user's conversations
    try {
      const response = await api.get('/messages/conversations');
      logTestResult('/messages/conversations', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/messages/conversations', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // GET /api/messages/conversation/{userId} - Get conversation with specific user
    try {
      // Use a dummy user ID for testing
      const response = await api.get('/messages/conversation/12345678-1234-1234-1234-123456789012');
      logTestResult('/messages/conversation/{userId}', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/messages/conversation/{userId}', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // PUT /api/messages/{id} - Edit a message (if we have a message ID)
    if (messageId) {
      try {
        const editData = {
          content: 'Updated test message from API testing'
        };
        const response = await api.put(`/messages/${messageId}`, editData);
        logTestResult(`/messages/${messageId}`, 'PUT', response.status, 200, response);
      } catch (error) {
        logTestResult(`/messages/${messageId}`, 'PUT', error.response?.status || 500, 200, error.response || {}, error);
      }
    }
    
    // POST /api/messages/{id}/read - Mark message as read (if we have a message ID)
    if (messageId) {
      try {
        const response = await api.post(`/messages/${messageId}/read`);
        logTestResult(`/messages/${messageId}/read`, 'POST', response.status, 200, response);
      } catch (error) {
        logTestResult(`/messages/${messageId}/read`, 'POST', error.response?.status || 500, 200, error.response || {}, error);
      }
    }
    
    // POST /api/messages/{id}/react - Add reaction to message (if we have a message ID)
    if (messageId) {
      try {
        const reactData = {
          reaction: '👍'
        };
        const response = await api.post(`/messages/${messageId}/react`, reactData);
        logTestResult(`/messages/${messageId}/react`, 'POST', response.status, 200, response);
      } catch (error) {
        logTestResult(`/messages/${messageId}/react`, 'POST', error.response?.status || 500, 200, error.response || {}, error);
      }
    }
    
    // GET /api/messages/search - Search messages
    try {
      const response = await api.get('/messages/search?q=test');
      logTestResult('/messages/search', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/messages/search', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
  } catch (error) {
    console.error('Error in messaging endpoints test:', error.message);
  }
}

// Test group management endpoints
async function testGroupEndpoints() {
  console.log('\n👥 Testing Group Management Endpoints');
  
  try {
    // GET /api/groups - Get user's groups
    try {
      const response = await api.get('/groups');
      logTestResult('/groups', 'GET', response.status, 200, response);
    } catch (error) {
      logTestResult('/groups', 'GET', error.response?.status || 500, 200, error.response || {}, error);
    }
    
    // POST /api/groups - Create a new group
    let groupId = null;
    try {
      const groupData = {
        name: 'Test Group API',
        description: 'Test group created via API testing'
      };
      const response = await api.post('/groups', groupData);
      groupId = response.data.data?.group?.id;
      logTestResult('/groups', 'POST', response.status, 201, response);
    } catch (error) {
      logTestResult('/groups', 'POST', error.response?.status || 500, 201, error.response || {}, error);
    }
    
    // GET /api/groups/{id} - Get group details (if we have a group ID)
    if (groupId) {
      try {
        const response = await api.get(`/groups/${groupId}`);
        logTestResult(`/groups/${groupId}`, 'GET', response.status, 200, response);
      } catch (error) {
        logTestResult(`/groups/${groupId}`, 'GET', error.response?.status || 500, 200, error.response || {}, error);
      }
      
      // PUT /api/groups/{id} - Update group information
      try {
        const updateData = {
          name: 'Updated Test Group API',
          description: 'Updated test group description'
        };
        const response = await api.put(`/groups/${groupId}`, updateData);
        logTestResult(`/groups/${groupId}`, 'PUT', response.status, 200, response);
      } catch (error) {
        logTestResult(`/groups/${groupId}`, 'PUT', error.response?.status || 500, 200, error.response || {}, error);
      }
      
      // POST /api/groups/{id}/members - Add member to group
      try {
        const memberData = {
          userId: '12345678-1234-1234-1234-123456789012', // Dummy user ID
          role: 'member'
        };
        const response = await api.post(`/groups/${groupId}/members`, memberData);
        logTestResult(`/groups/${groupId}/members`, 'POST', response.status, 200, response);
      } catch (error) {
        logTestResult(`/groups/${groupId}/members`, 'POST', error.response?.status || 500, 200, error.response || {}, error);
      }
      
      // GET /api/groups/{id}/members - Get group members
      try {
        const response = await api.get(`/groups/${groupId}/members`);
        logTestResult(`/groups/${groupId}/members`, 'GET', response.status, 200, response);
      } catch (error) {
        logTestResult(`/groups/${groupId}/members`, 'GET', error.response?.status || 500, 200, error.response || {}, error);
      }
    }
    
  } catch (error) {
    console.error('Error in group endpoints test:', error.message);
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Messaging API Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Base: ${API_BASE}`);
  
  try {
    await testUserEndpoints();
    await testContactsEndpoints();
    await testMessagingEndpoints();
    await testGroupEndpoints();
    
    // Save results to file
    const resultsJson = JSON.stringify(testResults, null, 2);
    fs.writeFileSync('messaging-api-test-results.json', resultsJson);
    
    // Print summary
    console.log('\n📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testResults.summary.totalTests}`);
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`💥 Errors: ${testResults.summary.errors}`);
    console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(2)}%`);
    console.log('\n📄 Detailed results saved to: messaging-api-test-results.json');
    
  } catch (error) {
    console.error('Fatal error during testing:', error.message);
  }
}

// Run tests
runAllTests();