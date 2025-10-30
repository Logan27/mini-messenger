import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';
const API_PREFIX = '/api';

// Test configuration
const testConfig = {
  // Use existing test user or create new one
  testUser: {
    email: 'filetest@example.com',
    password: 'Test123456!',
    username: 'filetestuser',
    firstName: 'FileTest',
    lastName: 'User'
  }
};

// Store auth token and test results
let authToken = null;
let testResults = {
  upload: [],
  download: [],
  list: [],
  thumbnail: [],
  delete: [],
  errors: []
};

// Helper function to log results
function logResult(category, testName, success, data, error = null) {
  const result = {
    test: testName,
    success,
    timestamp: new Date().toISOString(),
    data: data || null,
    error: error ? error.message : null,
    responseTime: data?.responseTime || null
  };
  
  testResults[category].push(result);
  
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}`);
  if (error) {
    console.log(`   Error: ${error.message}`);
    if (error.response?.data) {
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  if (data) {
    console.log(`   Response time: ${result.responseTime}ms`);
  }
}

// Helper function to make authenticated requests
async function authenticatedRequest(method, endpoint, data = null, options = {}) {
  const config = {
    method,
    url: `${API_BASE_URL}${API_PREFIX}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    ...options
  };
  
  if (data) {
    config.data = data;
  }
  
  const startTime = Date.now();
  try {
    const response = await axios(config);
    const responseTime = Date.now() - startTime;
    return { ...response, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    if (error.response) {
      return { ...error.response, responseTime, error };
    }
    throw { ...error, responseTime };
  }
}

// Authenticate and get JWT token
async function authenticate() {
  console.log('\n🔐 Authenticating test user...');
  
  try {
    // Try to login first
    let response = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/login`, {
      identifier: testConfig.testUser.email,
      password: testConfig.testUser.password
    });
    
    console.log('Login response:', JSON.stringify(response.data, null, 2));
    
    // Check different possible token locations in response
    authToken = response.data.token ||
                response.data.accessToken ||
                response.data.data?.token ||
                response.data.data?.accessToken ||
                response.data.data?.tokens?.accessToken ||
                response.data.tokens?.accessToken;
    
    if (!authToken) {
      console.error('No token found in response:', response.data);
      throw new Error('No authentication token received');
    }
    
    console.log('✅ Successfully authenticated existing user');
    return true;
  } catch (error) {
    // If login fails, try to register the user
    try {
      console.log('User not found, attempting to register...');
      await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/register`, testConfig.testUser);
      
      // Now try to login
      const response = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/login`, {
        identifier: testConfig.testUser.email,
        password: testConfig.testUser.password
      });
      
      console.log('Login response after registration:', JSON.stringify(response.data, null, 2));
      
      // Check different possible token locations in response
      authToken = response.data.token ||
                  response.data.accessToken ||
                  response.data.data?.token ||
                  response.data.data?.accessToken ||
                  response.data.data?.tokens?.accessToken ||
                  response.data.tokens?.accessToken;
      
      if (!authToken) {
        console.error('No token found in response:', response.data);
        throw new Error('No authentication token received');
      }
      
      console.log('✅ Successfully registered and authenticated new user');
      return true;
    } catch (registerError) {
      // User might already exist, try login again
      if (registerError.response?.data?.error?.type === 'USER_EXISTS') {
        console.log('User already exists, trying to login...');
        try {
          const response = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/login`, {
            identifier: testConfig.testUser.email,
            password: testConfig.testUser.password
          });
          
          // Check different possible token locations in response
          authToken = response.data.token ||
                      response.data.accessToken ||
                      response.data.data?.token ||
                      response.data.data?.accessToken;
          
          if (!authToken) {
            console.error('No token found in response:', response.data);
            throw new Error('No authentication token received');
          }
          
          console.log('✅ Successfully authenticated existing user');
          return true;
        } catch (loginError) {
          logResult('errors', 'Authentication', false, null, loginError);
          return false;
        }
      } else {
        logResult('errors', 'Authentication', false, null, registerError);
        return false;
      }
    }
  }
}

// Test file upload
async function testFileUpload(filePath, testName, options = {}) {
  console.log(`\n📤 Testing upload: ${testName}`);
  
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream(filePath));
    
    if (options.messageId) {
      form.append('messageId', options.messageId);
    }
    if (options.expiresAt) {
      form.append('expiresAt', options.expiresAt);
    }
    
    const startTime = Date.now();
    const response = await axios.post(
      `${API_BASE_URL}${API_PREFIX}/files/upload`,
      form,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...form.getHeaders()
        }
      }
    );
    const responseTime = Date.now() - startTime;
    
    logResult('upload', testName, true, { ...response.data, responseTime });
    return response.data.files;
  } catch (error) {
    logResult('upload', testName, false, null, error);
    return null;
  }
}

// Test file download
async function testFileDownload(fileId, testName) {
  console.log(`\n📥 Testing download: ${testName}`);
  
  try {
    const startTime = Date.now();
    const response = await authenticatedRequest('GET', `/files/${fileId}`);
    const responseTime = Date.now() - startTime;
    
    // Check if we got file data
    const isFileDownload = response.headers['content-disposition']?.includes('attachment');
    
    logResult('download', testName, true, {
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      disposition: response.headers['content-disposition'],
      fileId: response.headers['x-file-id'],
      downloadCount: response.headers['x-download-count'],
      isFileDownload,
      responseTime
    });
    
    return true;
  } catch (error) {
    logResult('download', testName, false, null, error);
    return false;
  }
}

// Test file list
async function testFileList(testName) {
  console.log(`\n📄 Testing file list: ${testName}`);
  
  try {
    const response = await authenticatedRequest('GET', `/files`);
    
    logResult('list', testName, true, response.data);
    return response.data;
  } catch (error) {
    logResult('list', testName, false, null, error);
    return null;
  }
}

// Test thumbnail
async function testThumbnail(fileId, testName) {
  console.log(`\n🖼️ Testing thumbnail: ${testName}`);
  
  try {
    const startTime = Date.now();
    const response = await authenticatedRequest('GET', `/files/${fileId}/thumbnail`);
    const responseTime = Date.now() - startTime;
    
    const isImage = response.headers['content-type']?.startsWith('image/');
    
    logResult('thumbnail', testName, true, {
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      fileId: response.headers['x-file-id'],
      thumbnailFor: response.headers['x-thumbnail-for'],
      isImage,
      responseTime
    });
    
    return true;
  } catch (error) {
    logResult('thumbnail', testName, false, null, error);
    return false;
  }
}

// Test file deletion
async function testFileDeletion(fileId, testName) {
  console.log(`\n🗑️ Testing deletion: ${testName}`);
  
  try {
    const response = await authenticatedRequest('POST', `/files/${fileId}/delete`, {
      reason: 'test_deletion'
    });
    
    logResult('delete', testName, true, response.data);
    return true;
  } catch (error) {
    logResult('delete', testName, false, null, error);
    return false;
  }
}

// Test invalid file ID
async function testInvalidFileId(endpoint, testName) {
  console.log(`\n❌ Testing invalid ID: ${testName}`);
  
  try {
    const response = await authenticatedRequest('GET', `/files/invalid-uuid-${endpoint}`);
    logResult('errors', testName, false, response.data, { message: 'Should have failed' });
  } catch (error) {
    logResult('errors', testName, true, { 
      expectedError: true,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
  }
}

// Main test function
async function runFileApiTests() {
  console.log('🚀 Starting File API Tests\n');
  console.log('=====================================');
  
  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n❌ Authentication failed. Cannot continue tests.');
    return;
  }
  
  // Test files to upload
  const testFiles = [
    { path: 'test-files/sample.txt', name: 'Text File' },
    { path: 'test-files/test-image.png', name: 'PNG Image' },
    { path: 'test-files/test-document.pdf', name: 'PDF Document' },
    { path: 'test-files/test-data.json', name: 'JSON Data' }
  ];
  
  const uploadedFiles = [];
  
  // Test 1: File Upload
  console.log('\n📤 TESTING FILE UPLOADS');
  console.log('=====================================');
  
  for (const file of testFiles) {
    if (fs.existsSync(file.path)) {
      const result = await testFileUpload(file.path, `Upload ${file.name}`);
      if (result && result.length > 0) {
        uploadedFiles.push({ ...file, id: result[0].id, data: result[0] });
      }
    } else {
      console.log(`⚠️ Test file not found: ${file.path}`);
    }
  }
  
  // Test 2: File Download
  console.log('\n📥 TESTING FILE DOWNLOADS');
  console.log('=====================================');
  
  for (const file of uploadedFiles) {
    await testFileDownload(file.id, `Download ${file.name}`);
  }
  
  // Test 3: File Info
  console.log('\n📄 TESTING FILE INFO');
  console.log('=====================================');
  
  for (const file of uploadedFiles) {
    await testFileInfo(file.id, `Info ${file.name}`);
  }
  
  // Test 4: Thumbnails
  console.log('\n🖼️ TESTING THUMBNAILS');
  console.log('=====================================');
  
  for (const file of uploadedFiles) {
    await testThumbnail(file.id, `Thumbnail ${file.name}`);
  }
  
  // Test 5: Invalid IDs
  console.log('\n❌ TESTING INVALID IDs');
  console.log('=====================================');
  
  await testInvalidFileId('download', 'Invalid Download ID');
  await testInvalidFileId('info', 'Invalid Info ID');
  await testInvalidFileId('thumbnail', 'Invalid Thumbnail ID');
  
  // Test 6: File Deletion
  console.log('\n🗑️ TESTING FILE DELETION');
  console.log('=====================================');
  
  for (const file of uploadedFiles) {
    await testFileDeletion(file.id, `Delete ${file.name}`);
  }
  
  // Test 7: Try to download deleted files
  console.log('\n📥 TESTING DELETED FILE ACCESS');
  console.log('=====================================');
  
  for (const file of uploadedFiles) {
    await testFileDownload(file.id, `Download Deleted ${file.name}`);
  }
  
  // Save results to file
  const resultsPath = 'file-api-test-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📊 Test results saved to: ${resultsPath}`);
  
  // Print summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=====================================');
  
  const categories = ['upload', 'download', 'info', 'thumbnail', 'delete'];
  let totalTests = 0;
  let totalPassed = 0;
  
  for (const category of categories) {
    const tests = testResults[category] || [];
    const passed = tests.filter(t => t.success).length;
    totalTests += tests.length;
    totalPassed += passed;
    
    console.log(`${category.toUpperCase()}: ${passed}/${tests.length} passed`);
  }
  
  console.log(`\nTOTAL: ${totalPassed}/${totalTests} tests passed`);
  
  if (testResults.errors.length > 0) {
    console.log(`\n⚠️ Additional errors/warnings: ${testResults.errors.length}`);
  }
  
  console.log('\n✅ File API testing complete!');
}

// Run the tests
runFileApiTests().catch(console.error);