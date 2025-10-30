import { io } from 'socket.io-client';
import axios from 'axios';

/**
 * Standalone WebSocket Connection Test
 * Tests WebSocket functionality without requiring full test infrastructure
 */

class WebSocketConnectionTest {
  constructor(serverUrl = 'http://localhost:4000') {
    this.serverUrl = serverUrl;
    this.testResults = {
      connectionTests: {},
      messagingTests: {},
      notificationTests: {},
      redisTests: {},
      issues: [],
      recommendations: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting WebSocket Connection Tests...\n');
    console.log(`📡 Server URL: ${this.serverUrl}\n`);

    try {
      // Check if server is running
      await this.checkServerHealth();

      // Test 1: Basic WebSocket Connection
      await this.testBasicConnection();

      // Test 2: Authentication
      await this.testAuthentication();

      // Test 3: Real-time Messaging
      await this.testRealtimeMessaging();

      // Test 4: Typing Indicators
      await this.testTypingIndicators();

      // Test 5: User Status
      await this.testUserStatus();

      // Test 6: Error Handling
      await this.testErrorHandling();

      // Test 7: Connection Stability
      await this.testConnectionStability();

      // Generate report
      await this.generateReport();

      return this.testResults;
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.issues.push({
        type: 'EXECUTION_ERROR',
        message: error.message,
        severity: 'ERROR'
      });
      await this.generateReport();
      throw error;
    }
  }

  async checkServerHealth() {
    console.log('🏥 Checking server health...');
    
    try {
      const response = await axios.get(`${this.serverUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ Server is healthy and running\n');
        this.testResults.serverHealth = {
          status: 'PASS',
          responseTime: response.headers['x-response-time'] || 'N/A',
          services: response.data.services || {}
        };
      } else {
        throw new Error(`Server health check failed with status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Server health check failed: ${error.message}\n`);
      this.testResults.serverHealth = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'SERVER_HEALTH',
        message: `Server health check failed: ${error.message}`,
        severity: 'ERROR'
      });
      throw error;
    }
  }

  async testBasicConnection() {
    console.log('🔗 Testing basic WebSocket connection...');
    
    try {
      const startTime = Date.now();
      const socket = io(this.serverUrl, {
        transports: ['websocket'],
        timeout: 5000
      });

      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          const connectionTime = Date.now() - startTime;
          console.log(`✅ WebSocket connected in ${connectionTime}ms`);
          resolve({ connected: true, connectionTime });
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const result = await connectionPromise;
      socket.disconnect();

      this.testResults.connectionTests.basicConnection = {
        status: 'PASS',
        connectionTime: result.connectionTime
      };
      console.log('✅ Basic connection test passed\n');
    } catch (error) {
      console.log(`❌ Basic connection test failed: ${error.message}\n`);
      this.testResults.connectionTests.basicConnection = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'CONNECTION_ERROR',
        message: `Basic connection failed: ${error.message}`,
        severity: 'ERROR'
      });
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing WebSocket authentication...');
    
    try {
      // First, create a test user and get auth token
      const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'testpassword123'
      };

      // Register user
      await axios.post(`${this.serverUrl}/api/v1/auth/register`, testUser);
      
      // Login to get token
      const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });

      const token = loginResponse.data.data.token;
      const userId = loginResponse.data.data.user.id;

      // Test authenticated connection
      const startTime = Date.now();
      const socket = io(this.serverUrl, {
        auth: { token },
        transports: ['websocket'],
        timeout: 5000
      });

      const authPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Authentication timeout'));
        }, 5000);

        socket.on('connect', () => {
          console.log('🔗 Socket connected, waiting for authentication...');
        });

        socket.on('authenticated', (data) => {
          clearTimeout(timeout);
          const authTime = Date.now() - startTime;
          console.log(`✅ WebSocket authenticated in ${authTime}ms`);
          console.log(`📝 User ID: ${data.userId}`);
          resolve({ authenticated: true, authTime, userId: data.userId });
        });

        socket.on('auth_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Authentication failed: ${error.message}`));
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const result = await authPromise;
      socket.disconnect();

      this.testResults.connectionTests.authentication = {
        status: 'PASS',
        authTime: result.authTime,
        userId: result.userId
      };
      console.log('✅ Authentication test passed\n');

      // Test invalid token
      await this.testInvalidToken();
    } catch (error) {
      console.log(`❌ Authentication test failed: ${error.message}\n`);
      this.testResults.connectionTests.authentication = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'AUTHENTICATION_ERROR',
        message: `Authentication failed: ${error.message}`,
        severity: 'ERROR'
      });
    }
  }

  async testInvalidToken() {
    console.log('🚫 Testing invalid token rejection...');
    
    try {
      const socket = io(this.serverUrl, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
        timeout: 5000
      });

      const rejectPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Should have been rejected with invalid token'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          reject(new Error('Connection should have been rejected'));
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          resolve({ rejected: true, error: error.message });
        });
      });

      const result = await rejectPromise;
      socket.disconnect();

      this.testResults.connectionTests.invalidToken = {
        status: 'PASS',
        rejected: true,
        error: result.error
      };
      console.log('✅ Invalid token properly rejected\n');
    } catch (error) {
      console.log(`❌ Invalid token test failed: ${error.message}\n`);
      this.testResults.connectionTests.invalidToken = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'INVALID_TOKEN_ERROR',
        message: `Invalid token not properly rejected: ${error.message}`,
        severity: 'ERROR'
      });
    }
  }

  async testRealtimeMessaging() {
    console.log('💬 Testing real-time messaging...');
    
    try {
      // Create two authenticated users
      const user1 = await this.createTestUser();
      const user2 = await this.createTestUser();

      const socket1 = io(this.serverUrl, {
        auth: { token: user1.token },
        transports: ['websocket']
      });

      const socket2 = io(this.serverUrl, {
        auth: { token: user2.token },
        transports: ['websocket']
      });

      // Wait for both to authenticate
      await Promise.all([
        this.waitForEvent(socket1, 'authenticated'),
        this.waitForEvent(socket2, 'authenticated')
      ]);

      // Set up message listener on socket2
      const messagePromise = this.waitForEvent(socket2, 'message');

      // Send message from socket1 to socket2
      const messageData = {
        recipientId: user2.userId,
        content: `Test message ${Date.now()}`,
        messageType: 'text'
      };

      socket1.emit('send_message', messageData);

      // Wait for message delivery
      const messageEvent = await messagePromise;
      const deliveryTime = Date.now() - messageData.timestamp;

      console.log(`✅ Message delivered in ${deliveryTime}ms`);

      socket1.disconnect();
      socket2.disconnect();

      this.testResults.messagingTests.realtimeDelivery = {
        status: 'PASS',
        deliveryTime,
        messageReceived: !!messageEvent
      };
      console.log('✅ Real-time messaging test passed\n');
    } catch (error) {
      console.log(`❌ Real-time messaging test failed: ${error.message}\n`);
      this.testResults.messagingTests.realtimeDelivery = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'MESSAGING_ERROR',
        message: `Real-time messaging failed: ${error.message}`,
        severity: 'ERROR'
      });
    }
  }

  async testTypingIndicators() {
    console.log('⌨️ Testing typing indicators...');
    
    try {
      const user1 = await this.createTestUser();
      const user2 = await this.createTestUser();

      const socket1 = io(this.serverUrl, {
        auth: { token: user1.token },
        transports: ['websocket']
      });

      const socket2 = io(this.serverUrl, {
        auth: { token: user2.token },
        transports: ['websocket']
      });

      await Promise.all([
        this.waitForEvent(socket1, 'authenticated'),
        this.waitForEvent(socket2, 'authenticated')
      ]);

      // Set up typing listener on socket2
      const typingPromise = this.waitForEvent(socket2, 'typing');

      // Send typing indicator from socket1
      socket1.emit('typing', {
        recipientId: user2.userId
      });

      // Wait for typing indicator
      const typingEvent = await typingPromise;

      console.log('✅ Typing indicator received');

      socket1.disconnect();
      socket2.disconnect();

      this.testResults.notificationTests.typingIndicators = {
        status: 'PASS',
        typingReceived: !!typingEvent
      };
      console.log('✅ Typing indicators test passed\n');
    } catch (error) {
      console.log(`❌ Typing indicators test failed: ${error.message}\n`);
      this.testResults.notificationTests.typingIndicators = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'TYPING_INDICATOR_ERROR',
        message: `Typing indicators failed: ${error.message}`,
        severity: 'WARNING'
      });
    }
  }

  async testUserStatus() {
    console.log('👤 Testing user status updates...');
    
    try {
      const user = await this.createTestUser();

      const socket = io(this.serverUrl, {
        auth: { token: user.token },
        transports: ['websocket']
      });

      await this.waitForEvent(socket, 'authenticated');

      // Set up status listener
      const statusPromise = this.waitForEvent(socket, 'user_status_update');

      // Send status update
      socket.emit('user_status_update', {
        status: 'away'
      });

      // Wait for status update confirmation
      const statusEvent = await statusPromise;

      console.log('✅ User status update received');

      socket.disconnect();

      this.testResults.notificationTests.userStatus = {
        status: 'PASS',
        statusUpdateReceived: !!statusEvent
      };
      console.log('✅ User status test passed\n');
    } catch (error) {
      console.log(`❌ User status test failed: ${error.message}\n`);
      this.testResults.notificationTests.userStatus = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'USER_STATUS_ERROR',
        message: `User status updates failed: ${error.message}`,
        severity: 'WARNING'
      });
    }
  }

  async testErrorHandling() {
    console.log('⚠️ Testing error handling...');
    
    try {
      const user = await this.createTestUser();

      const socket = io(this.serverUrl, {
        auth: { token: user.token },
        transports: ['websocket']
      });

      await this.waitForEvent(socket, 'authenticated');

      // Set up error listener
      const errorPromise = this.waitForEvent(socket, 'error');

      // Send invalid message data
      socket.emit('send_message', {
        // Missing required fields
      });

      // Wait for error event
      const errorEvent = await errorPromise;

      console.log('✅ Error event received');

      socket.disconnect();

      this.testResults.connectionTests.errorHandling = {
        status: 'PASS',
        errorReceived: !!errorEvent
      };
      console.log('✅ Error handling test passed\n');
    } catch (error) {
      console.log(`❌ Error handling test failed: ${error.message}\n`);
      this.testResults.connectionTests.errorHandling = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'ERROR_HANDLING_ERROR',
        message: `Error handling failed: ${error.message}`,
        severity: 'WARNING'
      });
    }
  }

  async testConnectionStability() {
    console.log('🔄 Testing connection stability...');
    
    try {
      const user = await this.createTestUser();

      const socket = io(this.serverUrl, {
        auth: { token: user.token },
        transports: ['websocket']
      });

      await this.waitForEvent(socket, 'authenticated');

      const stabilityResults = {
        heartbeatsSent: 0,
        heartbeatsReceived: 0,
        errors: []
      };

      // Test heartbeat/ping-pong for 10 seconds
      const interval = setInterval(() => {
        try {
          socket.emit('heartbeat');
          stabilityResults.heartbeatsSent++;
        } catch (error) {
          stabilityResults.errors.push(error.message);
        }
      }, 1000);

      // Listen for pong responses
      socket.on('pong', () => {
        stabilityResults.heartbeatsReceived++;
      });

      // Run for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      clearInterval(interval);

      const successRate = (stabilityResults.heartbeatsReceived / stabilityResults.heartbeatsSent) * 100;

      console.log(`✅ Heartbeat success rate: ${successRate.toFixed(1)}%`);

      socket.disconnect();

      this.testResults.connectionTests.stability = {
        status: successRate > 80 ? 'PASS' : 'FAIL',
        successRate,
        heartbeatsSent: stabilityResults.heartbeatsSent,
        heartbeatsReceived: stabilityResults.heartbeatsReceived
      };
      console.log('✅ Connection stability test passed\n');
    } catch (error) {
      console.log(`❌ Connection stability test failed: ${error.message}\n`);
      this.testResults.connectionTests.stability = {
        status: 'FAIL',
        error: error.message
      };
      this.testResults.issues.push({
        type: 'STABILITY_ERROR',
        message: `Connection stability test failed: ${error.message}`,
        severity: 'WARNING'
      });
    }
  }

  async createTestUser() {
    const testUser = {
      username: `ws_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `ws_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'testpassword123'
    };

    // Register user
    await axios.post(`${this.serverUrl}/api/v1/auth/register`, testUser);
    
    // Login to get token
    const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    return {
      token: loginResponse.data.data.token,
      userId: loginResponse.data.data.user.id,
      username: testUser.username
    };
  }

  waitForEvent(socket, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(eventName, eventHandler);
        reject(new Error(`Timeout waiting for ${eventName} event`));
      }, timeout);

      const eventHandler = (data) => {
        clearTimeout(timer);
        socket.off(eventName, eventHandler);
        resolve(data);
      };

      socket.on(eventName, eventHandler);
    });
  }

  async generateReport() {
    console.log('📝 Generating test report...');
    
    const reportContent = this.generateMarkdownReport();
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const reportPath = path.join(process.cwd(), 'websocket-test-results.md');
    await fs.writeFile(reportPath, reportContent, 'utf8');
    
    console.log(`✅ Test report generated: ${reportPath}`);
  }

  generateMarkdownReport() {
    const results = this.testResults;
    const timestamp = new Date().toISOString();

    const totalTests = Object.keys(results.connectionTests).length + 
                      Object.keys(results.messagingTests).length + 
                      Object.keys(results.notificationTests).length;
    
    const passedTests = Object.values({...results.connectionTests, ...results.messagingTests, ...results.notificationTests})
      .filter(test => test.status === 'PASS').length;
    
    const failedTests = totalTests - passedTests;
    const overallStatus = failedTests === 0 ? 'PASSED' : 'FAILED';

    return `# WebSocket Connection Test Results

**Generated:** ${timestamp}  
**Test Status:** ${overallStatus}  
**Total Tests:** ${totalTests}  
**Passed:** ${passedTests}  
**Failed:** ${failedTests}  

---

## Executive Summary

${overallStatus === 'PASSED' ? 
  '✅ **WebSocket functionality is working correctly** with all critical real-time features operational.' :
  '❌ **WebSocket functionality has issues** that need to be addressed before production deployment.'}

### Key Findings

${results.issues.length > 0 ? 
  `⚠️ **${results.issues.length} issues detected** that may impact WebSocket performance and reliability.` :
  '✅ **No critical issues detected** in WebSocket implementation.'}

---

## 1. WebSocket Connection Testing

### Basic Connection
**Status:** ${results.connectionTests.basicConnection?.status || 'NOT_TESTED'}  
${results.connectionTests.basicConnection?.status === 'PASS' ? 
  `✅ WebSocket connection established in ${results.connectionTests.basicConnection.connectionTime}ms` :
  results.connectionTests.basicConnection?.status === 'FAIL' ?
  `❌ Connection failed: ${results.connectionTests.basicConnection.error}` :
  '⏭️ Test not executed'}

### Authentication
**Status:** ${results.connectionTests.authentication?.status || 'NOT_TESTED'}  
${results.connectionTests.authentication?.status === 'PASS' ? 
  `✅ Authentication successful in ${results.connectionTests.authentication.authTime}ms` :
  results.connectionTests.authentication?.status === 'FAIL' ?
  `❌ Authentication failed: ${results.connectionTests.authentication.error}` :
  '⏭️ Test not executed'}

### Invalid Token Rejection
**Status:** ${results.connectionTests.invalidToken?.status || 'NOT_TESTED'}  
${results.connectionTests.invalidToken?.status === 'PASS' ? 
  '✅ Invalid tokens properly rejected' :
  results.connectionTests.invalidToken?.status === 'FAIL' ?
  `❌ Invalid token rejection failed: ${results.connectionTests.invalidToken.error}` :
  '⏭️ Test not executed'}

### Error Handling
**Status:** ${results.connectionTests.errorHandling?.status || 'NOT_TESTED'}  
${results.connectionTests.errorHandling?.status === 'PASS' ? 
  '✅ WebSocket errors handled gracefully' :
  results.connectionTests.errorHandling?.status === 'FAIL' ?
  `❌ Error handling failed: ${results.connectionTests.errorHandling.error}` :
  '⏭️ Test not executed'}

### Connection Stability
**Status:** ${results.connectionTests.stability?.status || 'NOT_TESTED'}  
${results.connectionTests.stability?.status === 'PASS' ? 
  `✅ Connection stable with ${results.connectionTests.stability.successRate.toFixed(1)}% heartbeat success rate` :
  results.connectionTests.stability?.status === 'FAIL' ?
  `❌ Connection stability issues: ${results.connectionTests.stability.error}` :
  '⏭️ Test not executed'}

---

## 2. Real-time Messaging

### Message Delivery
**Status:** ${results.messagingTests.realtimeDelivery?.status || 'NOT_TESTED'}  
${results.messagingTests.realtimeDelivery?.status === 'PASS' ? 
  `✅ Messages delivered in ${results.messagingTests.realtimeDelivery.deliveryTime}ms` :
  results.messagingTests.realtimeDelivery?.status === 'FAIL' ?
  `❌ Message delivery failed: ${results.messagingTests.realtimeDelivery.error}` :
  '⏭️ Test not executed'}

---

## 3. Real-time Notifications

### Typing Indicators
**Status:** ${results.notificationTests.typingIndicators?.status || 'NOT_TESTED'}  
${results.notificationTests.typingIndicators?.status === 'PASS' ? 
  '✅ Typing indicators working correctly' :
  results.notificationTests.typingIndicators?.status === 'FAIL' ?
  `❌ Typing indicators failed: ${results.notificationTests.typingIndicators.error}` :
  '⏭️ Test not executed'}

### User Status Updates
**Status:** ${results.notificationTests.userStatus?.status || 'NOT_TESTED'}  
${results.notificationTests.userStatus?.status === 'PASS' ? 
  '✅ User status updates working correctly' :
  results.notificationTests.userStatus?.status === 'FAIL' ?
  `❌ User status updates failed: ${results.notificationTests.userStatus.error}` :
  '⏭️ Test not executed'}

---

## Issues Detected

${results.issues.length > 0 ? 
  results.issues.map(issue => 
    `### ${issue.type.replace('_', ' ')}\n**Severity:** ${issue.severity}\n**Message:** ${issue.message}\n`
  ).join('\n') :
  '✅ No issues detected in WebSocket implementation.'
}

---

## Recommendations

${results.issues.length > 0 ? 
  results.issues.map(issue => {
    if (issue.type.includes('AUTHENTICATION')) {
      return '### Authentication\nReview JWT token validation and WebSocket authentication middleware.';
    } else if (issue.type.includes('CONNECTION')) {
      return '### Connection\nCheck WebSocket server configuration and network connectivity.';
    } else if (issue.type.includes('MESSAGING')) {
      return '### Messaging\nVerify message routing and delivery mechanisms.';
    } else {
      return '### General\nReview WebSocket implementation for the identified issues.';
    }
  }).join('\n') :
  '✅ WebSocket implementation meets all requirements. No immediate recommendations.'
}

---

## Technical Details

### WebSocket Configuration
- **Server URL:** ${this.serverUrl}
- **Transports Tested:** WebSocket
- **Authentication Method:** JWT Token
- **Test Duration:** ~30 seconds

### Test Environment
- **Node.js Version:** ${process.version}
- **Test Library:** Socket.IO Client
- **Test Date:** ${new Date().toLocaleString()}

---

*This report was generated automatically by the WebSocket connection test runner.*
`;
  }
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new WebSocketConnectionTest();
  
  tester.runAllTests()
    .then((results) => {
      const totalIssues = results.issues.length;
      const criticalIssues = results.issues.filter(i => i.severity === 'ERROR').length;
      
      if (criticalIssues === 0) {
        console.log('\n🎉 WebSocket testing completed successfully!');
        console.log(`📊 Total issues: ${totalIssues} (${criticalIssues} critical)`);
      } else {
        console.log('\n⚠️ WebSocket testing completed with issues!');
        console.log(`📊 Total issues: ${totalIssues} (${criticalIssues} critical)`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 WebSocket testing failed:', error);
      process.exit(1);
    });
}

export default WebSocketConnectionTest;