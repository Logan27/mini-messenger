/**
 * Targeted Test Suite for Previously Skipped Tests
 * Addresses the 21 tests that were skipped in the enhanced API test suite
 * Date: October 21, 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:4000';
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
  skipped: 0,
  total: 0,
  tests: [],
};

// Authentication tokens and resource IDs
let userToken = null;
let adminToken = null;
let userId = null;
let messageId = null;
let contactId = null;
let groupId = null;
let fileId = null;
let notificationId = null;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, status, duration, details = '') {
  const statusColor = status === 'PASS' ? colors.green : status === 'SKIP' ? colors.yellow : colors.red;
  const statusSymbol = status === 'PASS' ? '✓' : status === 'SKIP' ? '⊘' : '✗';
  log(`${statusSymbol} ${name} (${duration}ms) ${details}`, statusColor);

  testResults.tests.push({ name, status, duration, details });
  testResults.total++;
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.skipped++;
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
    return null;
  }
}

async function skipTest(name, reason) {
  logTest(name, 'SKIP', 0, reason);
}

// Helper function for extracting data from API responses
function extractIdFromResponse(response, path = 'data.id') {
  try {
    const parts = path.split('.');
    let result = response.data;
    for (const part of parts) {
      if (part.includes('[') && part.includes(']')) {
        const [arrayPart, index, prop] = part.match(/([^\[]+)\[(\d+)\]\.?(.*)/).slice(1);
        result = result[arrayPart][parseInt(index)];
        if (prop) result = result[prop];
      } else {
        result = result[part];
      }
    }
    return result;
  } catch (error) {
    console.error(`Failed to extract ID from path ${path}:`, error.message);
    return null;
  }
}

// Authentication setup
async function setupAuthentication() {
  try {
    // Create and login as regular user
    const uniqueId = Date.now();
    const userResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `testuser${uniqueId}`,
      email: `testuser${uniqueId}@test.com`,
      password: 'Test123456!',
      firstName: 'Test',
      lastName: 'User',
    });

    if (userResponse.data.success) {
      userId = userResponse.data.data.user.id;

      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        identifier: `testuser${uniqueId}@test.com`,
        password: 'Test123456!',
      });

      if (loginResponse.data.success) {
        userToken = loginResponse.data.data.tokens.accessToken;
      }
    }

    // Login as admin
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      identifier: 'admin@messenger.local',
      password: 'Test123456#',
    });

    if (adminLoginResponse.data.success) {
      adminToken = adminLoginResponse.data.data.tokens.accessToken;
    }

    return {
      userToken: !!userToken,
      adminToken: !!adminToken,
      userId: !!userId,
    };
  } catch (error) {
    console.error('Authentication setup failed:', error.message);
    return {
      userToken: false,
      adminToken: false,
      userId: false,
    };
  }
}

// Resource creation functions
async function createTestMessage() {
  try {
    // Create a second user to send message to
    const uniqueId = Date.now() + 1;
    const userResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `testuser${uniqueId}`,
      email: `testuser${uniqueId}@test.com`,
      password: 'Test123456!',
      firstName: 'Test',
      lastName: 'User2',
    });

    const recipientId = userResponse.data.data.user.id;

    const response = await axios.post(
      `${BASE_URL}/api/messages`,
      {
        recipientId,
        content: 'Test message for skipped tests',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (response.data.success) {
      messageId = extractIdFromResponse(response, 'data.id');
      return messageId;
    }
    return null;
  } catch (error) {
    console.error('Failed to create test message:', error.message);
    return null;
  }
}

async function createTestContact() {
  try {
    // Create a user to add as contact
    const uniqueId = Date.now() + 2;
    const userResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `contactuser${uniqueId}`,
      email: `contactuser${uniqueId}@test.com`,
      password: 'Test123456!',
      firstName: 'Contact',
      lastName: 'User',
    });

    const contactUserId = userResponse.data.data.user.id;

    const response = await axios.post(
      `${BASE_URL}/api/contacts`,
      {
        userId: contactUserId,
        nickname: 'Test Contact',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (response.data.success) {
      contactId = extractIdFromResponse(response, 'data.id');
      return contactId;
    }
    return null;
  } catch (error) {
    console.error('Failed to create test contact:', error.message);
    return null;
  }
}

async function createTestGroup() {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/groups`,
      {
        name: 'Test Group for Skipped Tests',
        description: 'Group created for testing previously skipped endpoints',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (response.data.success) {
      groupId = extractIdFromResponse(response, 'data.id');
      return groupId;
    }
    return null;
  } catch (error) {
    console.error('Failed to create test group:', error.message);
    
    // Create a dummy group ID for testing purposes
    groupId = 'test-group-' + Date.now();
    console.log('Using dummy group ID for testing:', groupId);
    return groupId;
  }
}

async function uploadTestFile() {
  try {
    const testFilePath = path.join(process.cwd(), 'test-files', 'test-image.png');
    
    if (!fs.existsSync(testFilePath)) {
      console.error('Test file not found:', testFilePath);
      // Create a dummy file ID for testing
      fileId = 'test-file-' + Date.now();
      console.log('Using dummy file ID for testing:', fileId);
      return fileId;
    }

    const form = new FormData();
    form.append('files', fs.createReadStream(testFilePath));

    const response = await axios.post(`${BASE_URL}/api/files/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (response.data.success) {
      // Handle different response structures
      if (response.data.data.files && Array.isArray(response.data.data.files)) {
        fileId = response.data.data.files[0].id;
      } else if (response.data.data.file) {
        fileId = response.data.data.file.id;
      } else if (response.data.data.id) {
        fileId = response.data.data.id;
      }
      return fileId;
    }
    
    // Create a dummy file ID for testing
    fileId = 'test-file-' + Date.now();
    console.log('Using dummy file ID for testing:', fileId);
    return fileId;
  } catch (error) {
    console.error('Failed to upload test file:', error.message);
    // Create a dummy file ID for testing
    fileId = 'test-file-' + Date.now();
    console.log('Using dummy file ID for testing:', fileId);
    return fileId;
  }
}

async function createTestNotification() {
  try {
    // First try to get existing notifications
    try {
      const notifResponse = await axios.get(`${BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (notifResponse.data.success && notifResponse.data.data.notifications.length > 0) {
        notificationId = notifResponse.data.data.notifications[0].id;
        return notificationId;
      }
    } catch (error) {
      console.log('No existing notifications found, will try to create one');
    }

    // Create a notification via admin endpoint if admin token is available
    if (adminToken) {
      try {
        const response = await axios.post(
          `${BASE_URL}/api/admin/notifications`,
          {
            title: 'Test Notification',
            message: 'Test notification for skipped tests',
            type: 'info',
          },
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );

        if (response.data.success) {
          // Get notifications to extract ID
          const notifResponse = await axios.get(`${BASE_URL}/api/notifications`, {
            headers: { Authorization: `Bearer ${userToken}` },
          });

          if (notifResponse.data.success && notifResponse.data.data.notifications.length > 0) {
            notificationId = notifResponse.data.data.notifications[0].id;
            return notificationId;
          }
        }
      } catch (error) {
        console.log('Failed to create notification via admin endpoint');
      }
    }

    // Create a simple message that might generate a notification
    if (userId) {
      try {
        const uniqueId = Date.now();
        const userResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
          username: `notifuser${uniqueId}`,
          email: `notifuser${uniqueId}@test.com`,
          password: 'Test123456!',
          firstName: 'Notif',
          lastName: 'User',
        });

        const recipientId = userResponse.data.data.user.id;

        await axios.post(
          `${BASE_URL}/api/messages`,
          {
            recipientId,
            content: 'Test message for notification',
          },
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        // Check for notifications again
        const notifResponse = await axios.get(`${BASE_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });

        if (notifResponse.data.success && notifResponse.data.data.notifications.length > 0) {
          notificationId = notifResponse.data.data.notifications[0].id;
          return notificationId;
        }
      } catch (error) {
        console.log('Failed to create notification via message');
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to create test notification:', error.message);
    return null;
  }
}

// Previously skipped messaging tests
async function testMarkMessageAsRead() {
  if (!messageId) return skipTest('Mark Message as Read', 'No message ID available');
  
  return runTest('Mark Message as Read', async () => {
    const response = await axios.post(
      `${BASE_URL}/api/messages/${messageId}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error(`Failed to mark message as read: ${JSON.stringify(response.data)}`);
    }

    return { message: `Message ${messageId} marked as read` };
  });
}

async function testMarkMessageAsDelivered() {
  if (!messageId) return skipTest('Mark Message as Delivered', 'No message ID available');
  
  return runTest('Mark Message as Delivered', async () => {
    const response = await axios.post(
      `${BASE_URL}/api/messages/${messageId}/delivered`,
      {},
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error(`Failed to mark message as delivered: ${JSON.stringify(response.data)}`);
    }

    return { message: `Message ${messageId} marked as delivered` };
  });
}

async function testEditMessage() {
  if (!messageId) return skipTest('Edit Message', 'No message ID available');
  
  return runTest('Edit Message', async () => {
    const response = await axios.put(
      `${BASE_URL}/api/messages/${messageId}`,
      {
        content: 'Edited test message from targeted skipped tests',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error(`Failed to edit message: ${JSON.stringify(response.data)}`);
    }

    return { message: `Message ${messageId} edited successfully` };
  });
}

async function testDeleteMessage() {
  if (!messageId) return skipTest('Delete Message', 'No message ID available');
  
  return runTest('Delete Message', async () => {
    const response = await axios.delete(`${BASE_URL}/api/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to delete message: ${JSON.stringify(response.data)}`);
    }

    return { message: `Message ${messageId} deleted successfully` };
  });
}

async function testGetEditHistory() {
  if (!messageId) return skipTest('Get Message Edit History', 'No message ID available');
  
  return runTest('Get Message Edit History', async () => {
    const response = await axios.get(`${BASE_URL}/api/messages/${messageId}/edit-history`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to get edit history: ${JSON.stringify(response.data)}`);
    }

    const historyCount = response.data.data?.history?.length || 0;
    return { message: `Edit history retrieved: ${historyCount} entries` };
  });
}

// Previously skipped contact tests
async function testRemoveContact() {
  if (!contactId) return skipTest('Remove Contact', 'No contact ID available');
  
  return runTest('Remove Contact', async () => {
    const response = await axios.delete(`${BASE_URL}/api/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to remove contact: ${JSON.stringify(response.data)}`);
    }

    return { message: `Contact ${contactId} removed successfully` };
  });
}

// Previously skipped group tests
async function testGetGroupDetails() {
  if (!groupId) return skipTest('Get Group Details', 'No group ID available');
  
  return runTest('Get Group Details', async () => {
    const response = await axios.get(`${BASE_URL}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to get group details: ${JSON.stringify(response.data)}`);
    }

    const groupName = response.data.data?.name || 'Unknown';
    return { message: `Group details retrieved: ${groupName}` };
  });
}

async function testUpdateGroup() {
  if (!groupId) return skipTest('Update Group', 'No group ID available');
  
  return runTest('Update Group', async () => {
    const response = await axios.put(
      `${BASE_URL}/api/groups/${groupId}`,
      {
        name: 'Updated Test Group',
        description: 'Updated group for testing previously skipped endpoints',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error(`Failed to update group: ${JSON.stringify(response.data)}`);
    }

    return { message: `Group ${groupId} updated successfully` };
  });
}

async function testDeleteGroup() {
  if (!groupId) return skipTest('Delete Group', 'No group ID available');
  
  return runTest('Delete Group', async () => {
    const response = await axios.delete(`${BASE_URL}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to delete group: ${JSON.stringify(response.data)}`);
    }

    return { message: `Group ${groupId} deleted successfully` };
  });
}

async function testAddGroupMember() {
  if (!groupId || !userId) return skipTest('Add Group Member', 'No group ID or user ID available');
  
  return runTest('Add Group Member', async () => {
    const response = await axios.post(
      `${BASE_URL}/api/groups/${groupId}/members`,
      {
        userId,
        role: 'member',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error(`Failed to add group member: ${JSON.stringify(response.data)}`);
    }

    return { message: `User ${userId} added to group ${groupId}` };
  });
}

async function testGetGroupMembers() {
  if (!groupId) return skipTest('Get Group Members', 'No group ID available');
  
  return runTest('Get Group Members', async () => {
    const response = await axios.get(`${BASE_URL}/api/groups/${groupId}/members`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to get group members: ${JSON.stringify(response.data)}`);
    }

    const memberCount = response.data.data?.members?.length || 0;
    return { message: `Group members retrieved: ${memberCount} members` };
  });
}

async function testUpdateMemberRole() {
  if (!groupId || !userId) return skipTest('Update Member Role', 'No group ID or user ID available');
  
  return runTest('Update Member Role', async () => {
    const response = await axios.put(
      `${BASE_URL}/api/groups/${groupId}/members/${userId}`,
      {
        role: 'admin',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error(`Failed to update member role: ${JSON.stringify(response.data)}`);
    }

    return { message: `User ${userId} role updated to admin in group ${groupId}` };
  });
}

async function testRemoveGroupMember() {
  if (!groupId || !userId) return skipTest('Remove Group Member', 'No group ID or user ID available');
  
  return runTest('Remove Group Member', async () => {
    const response = await axios.delete(`${BASE_URL}/api/groups/${groupId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to remove group member: ${JSON.stringify(response.data)}`);
    }

    return { message: `User ${userId} removed from group ${groupId}` };
  });
}

// Previously skipped file tests
async function testDownloadFile() {
  if (!fileId) return skipTest('Download File', 'No file ID available');
  
  return runTest('Download File', async () => {
    const response = await axios.get(`${BASE_URL}/api/files/${fileId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
      responseType: 'arraybuffer',
    });

    if (!response.data) {
      throw new Error('No file data received');
    }

    return { message: `File ${fileId} downloaded successfully (${response.data.length} bytes)` };
  });
}

async function testGetFileInfo() {
  if (!fileId) return skipTest('Get File Info', 'No file ID available');
  
  return runTest('Get File Info', async () => {
    const response = await axios.get(`${BASE_URL}/api/files/${fileId}/info`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to get file info: ${JSON.stringify(response.data)}`);
    }

    const fileName = response.data.data?.originalName || 'Unknown';
    return { message: `File info retrieved: ${fileName}` };
  });
}

async function testGetFileThumbnail() {
  if (!fileId) return skipTest('Get File Thumbnail', 'No file ID available');
  
  return runTest('Get File Thumbnail', async () => {
    const response = await axios.get(`${BASE_URL}/api/files/${fileId}/thumbnail`, {
      headers: { Authorization: `Bearer ${userToken}` },
      responseType: 'arraybuffer',
    });

    // Thumbnail might not exist, which is expected for some file types
    return { message: `File thumbnail response received (${response.data.length} bytes)` };
  });
}

async function testDeleteFile() {
  if (!fileId) return skipTest('Delete File', 'No file ID available');
  
  return runTest('Delete File', async () => {
    const response = await axios.delete(`${BASE_URL}/api/files/${fileId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to delete file: ${JSON.stringify(response.data)}`);
    }

    return { message: `File ${fileId} deleted successfully` };
  });
}

async function testAdminListAllFiles() {
  if (!adminToken) return skipTest('Admin List All Files', 'No admin token available');
  
  return runTest('Admin List All Files', async () => {
    // Try different admin endpoints
    const endpoints = [
      '/api/admin/files',
      '/api/admin/files/list',
      '/api/admin/all-files',
      '/api/files/admin'
    ];

    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });

        if (response.data.success) {
          const fileCount = response.data.data?.files?.length || response.data.data?.length || 0;
          return { message: `Admin files list retrieved: ${fileCount} files from ${endpoint}` };
        }
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    throw new Error(`Failed to list admin files: ${lastError?.message || 'Unknown error'}`);
  });
}

async function testAdminDeleteFile() {
  if (!adminToken || !fileId) return skipTest('Admin Delete File', 'No admin token or file ID available');
  
  return runTest('Admin Delete File', async () => {
    const response = await axios.delete(`${BASE_URL}/api/admin/files/${fileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to delete file as admin: ${JSON.stringify(response.data)}`);
    }

    return { message: `File ${fileId} deleted by admin successfully` };
  });
}

// Previously skipped notification tests
async function testMarkNotificationAsRead() {
  if (!notificationId) return skipTest('Mark Notification as Read', 'No notification ID available');
  
  return runTest('Mark Notification as Read', async () => {
    const response = await axios.put(`${BASE_URL}/api/notifications/${notificationId}/read`, {}, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to mark notification as read: ${JSON.stringify(response.data)}`);
    }

    return { message: `Notification ${notificationId} marked as read` };
  });
}

async function testDeleteNotification() {
  if (!notificationId) return skipTest('Delete Notification', 'No notification ID available');
  
  return runTest('Delete Notification', async () => {
    const response = await axios.delete(`${BASE_URL}/api/notifications/${notificationId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.data.success) {
      throw new Error(`Failed to delete notification: ${JSON.stringify(response.data)}`);
    }

    return { message: `Notification ${notificationId} deleted successfully` };
  });
}

function printSummary() {
  log('\n' + '='.repeat(80), colors.cyan);
  log('TARGETED SKIPPED TESTS SUMMARY', colors.cyan);
  log('='.repeat(80), colors.cyan);

  const passRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
  const passRateColor = passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;

  log(`Total Tests: ${testResults.total}`, colors.blue);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, colors.red);
  log(`Skipped: ${testResults.skipped}`, colors.yellow);
  log(`Pass Rate: ${passRate}%`, passRateColor);

  if (testResults.failed > 0) {
    log('\nFailed Tests:', colors.red);
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        log(`  ✗ ${t.name}: ${t.details}`, colors.red);
      });
  }

  if (testResults.skipped > 0) {
    log('\nSkipped Tests:', colors.yellow);
    testResults.tests
      .filter(t => t.status === 'SKIP')
      .forEach(t => {
        log(`  ⊘ ${t.name}: ${t.details}`, colors.yellow);
      });
  }

  log('\n' + '='.repeat(80), colors.cyan);

  const status = testResults.failed === 0 ? '✅ ALL EXECUTABLE TESTS PASSED' : '❌ SOME TESTS FAILED';
  const statusColor = testResults.failed === 0 ? colors.green : colors.red;
  log(status, statusColor);
  log('='.repeat(80) + '\n', colors.cyan);

  // Save results to file
  const resultsFile = `test-results/targeted-skipped-tests-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
  log(`Detailed results saved to: ${resultsFile}`, colors.blue);
}

async function main() {
  log('\n' + '='.repeat(80), colors.cyan);
  log('TARGETED TEST SUITE FOR PREVIOUSLY SKIPPED TESTS', colors.cyan);
  log('Testing the 21 endpoints that were skipped in the enhanced test suite', colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);

  try {
    // Setup authentication
    log('Setting up authentication...', colors.blue);
    const authSetup = await setupAuthentication();
    
    if (!authSetup.userToken) {
      log('Failed to setup user authentication', colors.red);
      return;
    }
    
    if (!authSetup.adminToken) {
      log('Warning: Failed to setup admin authentication', colors.yellow);
    }

    log('Authentication setup completed', colors.green);
    log(`User Token: ${userToken ? 'Available' : 'Not available'}`, colors.blue);
    log(`Admin Token: ${adminToken ? 'Available' : 'Not available'}`, colors.blue);
    log(`User ID: ${userId}`, colors.blue);

    // Create test resources
    log('\nCreating test resources...', colors.blue);
    await createTestMessage();
    await createTestContact();
    await createTestGroup();
    await uploadTestFile();
    await createTestNotification();

    log(`Resource IDs - Message: ${messageId}, Contact: ${contactId}, Group: ${groupId}, File: ${fileId}, Notification: ${notificationId}`, colors.blue);

    // Execute previously skipped tests
    log('\n' + '='.repeat(60), colors.cyan);
    log('MESSAGING TESTS (5 tests)', colors.cyan);
    log('='.repeat(60), colors.cyan);
    
    await testMarkMessageAsRead();
    await testMarkMessageAsDelivered();
    await testEditMessage();
    await testDeleteMessage();
    await testGetEditHistory();

    log('\n' + '='.repeat(60), colors.cyan);
    log('CONTACTS TESTS (1 test)', colors.cyan);
    log('='.repeat(60), colors.cyan);
    
    await testRemoveContact();

    log('\n' + '='.repeat(60), colors.cyan);
    log('GROUPS TESTS (7 tests)', colors.cyan);
    log('='.repeat(60), colors.cyan);
    
    await testGetGroupDetails();
    await testUpdateGroup();
    await testDeleteGroup();
    await testAddGroupMember();
    await testGetGroupMembers();
    await testUpdateMemberRole();
    await testRemoveGroupMember();

    log('\n' + '='.repeat(60), colors.cyan);
    log('FILES TESTS (6 tests)', colors.cyan);
    log('='.repeat(60), colors.cyan);
    
    await testDownloadFile();
    await testGetFileInfo();
    await testGetFileThumbnail();
    await testDeleteFile();
    await testAdminListAllFiles();
    await testAdminDeleteFile();

    log('\n' + '='.repeat(60), colors.cyan);
    log('NOTIFICATIONS TESTS (2 tests)', colors.cyan);
    log('='.repeat(60), colors.cyan);
    
    await testMarkNotificationAsRead();
    await testDeleteNotification();

  } catch (error) {
    log(`Unexpected error during test execution: ${error.message}`, colors.red);
  }

  printSummary();

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Create test-results directory if it doesn't exist
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

main();