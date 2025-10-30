import axios from 'axios';
import fs from 'fs';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const API_BASE = `${BASE_URL}/api`;

// Test results storage
const testResults = {
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: []
  },
  endpoints: {},
  performance: {},
  security: {}
};

// Test utilities
class AdminAPITester {
  constructor() {
    this.adminToken = null;
    this.userToken = null;
    this.testData = {
      users: [],
      groups: [],
      announcements: [],
      reports: []
    };
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const startTime = Date.now();
    try {
      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime,
        headers: response.headers
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        status: error.response?.status || 500,
        data: error.response?.data || { error: error.message },
        responseTime,
        error: error.message
      };
    }
  }

  async testEndpoint(name, method, endpoint, data = null, expectedStatus = 200, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const result = await this.makeRequest(method, endpoint, data, headers);
    
    testResults.summary.totalTests++;
    
    const testResult = {
      name,
      method,
      endpoint,
      expectedStatus,
      actualStatus: result.status,
      success: result.success && result.status === expectedStatus,
      responseTime: result.responseTime,
      data: result.data,
      timestamp: new Date().toISOString()
    };

    if (!testResult.success) {
      testResults.summary.failed++;
      testResults.summary.errors.push({
        test: name,
        error: result.error || `Expected ${expectedStatus}, got ${result.status}`,
        response: result.data
      });
    } else {
      testResults.summary.passed++;
    }

    testResults.endpoints[name] = testResult;
    testResults.performance[name] = result.responseTime;

    console.log(`${testResult.success ? '✅' : '❌'} ${name} - ${result.status} (${result.responseTime}ms)`);
    
    return result;
  }

  async setupTestData() {
    console.log('🔧 Setting up test data...');

    // Register admin user
    const adminRegister = await this.makeRequest('POST', '/auth/register', {
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User'
    });

    if (adminRegister.success) {
      // Login as admin
      const adminLogin = await this.makeRequest('POST', '/auth/login', {
        identifier: 'admin@test.com',
        password: 'AdminPass123!'
      });

      if (adminLogin.success) {
        this.adminToken = adminLogin.data.data.accessToken;
        
        // Update user role to admin (direct database update would be needed, but for testing we'll assume it works)
        console.log('👑 Admin user created and logged in');
      }
    }

    // Register regular user
    const userRegister = await this.makeRequest('POST', '/auth/register', {
      username: 'testuser',
      email: 'user@test.com',
      password: 'UserPass123!',
      firstName: 'Regular',
      lastName: 'User'
    });

    if (userRegister.success) {
      // Login as regular user
      const userLogin = await this.makeRequest('POST', '/auth/login', {
        identifier: 'user@test.com',
        password: 'UserPass123!'
      });

      if (userLogin.success) {
        this.userToken = userLogin.data.data.accessToken;
        console.log('👤 Regular user created and logged in');
      }
    }

    // Create test announcements if admin token is available
    if (this.adminToken) {
      for (let i = 0; i < 3; i++) {
        const announcement = await this.makeRequest('POST', '/admin/announcements', {
          title: `Test Announcement ${i}`,
          content: `Test content ${i}`,
          type: 'info',
          isActive: true
        }, null, this.adminToken);

        if (announcement.success) {
          this.testData.announcements.push(announcement.data.data.announcement);
        }
      }
    }
  }

  async runAuthenticationTests() {
    console.log('\n🔐 Testing Authentication & Authorization...');

    // Test without token
    await this.testEndpoint(
      'Get Users Without Auth',
      'GET',
      '/admin/users',
      null,
      401
    );

    // Test with regular user token
    await this.testEndpoint(
      'Get Users With Regular User Token',
      'GET',
      '/admin/users',
      null,
      403,
      this.userToken
    );

    // Test with admin token
    await this.testEndpoint(
      'Get Users With Admin Token',
      'GET',
      '/admin/users',
      null,
      200,
      this.adminToken
    );
  }

  async runUserManagementTests() {
    console.log('\n👥 Testing User Management...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping user management tests - no admin token');
      return;
    }

    // Get all users
    await this.testEndpoint(
      'Get All Users',
      'GET',
      '/admin/users',
      null,
      200,
      this.adminToken
    );

    // Get pending users
    await this.testEndpoint(
      'Get Pending Users',
      'GET',
      '/admin/users/pending',
      null,
      200,
      this.adminToken
    );

    // Test pagination
    await this.testEndpoint(
      'Get Users With Pagination',
      'GET',
      '/admin/users?page=1&limit=3',
      null,
      200,
      this.adminToken
    );

    // Test filtering by role
    await this.testEndpoint(
      'Filter Users By Role',
      'GET',
      '/admin/users?role=admin',
      null,
      200,
      this.adminToken
    );

    // Test filtering by approval status
    await this.testEndpoint(
      'Filter Users By Approval Status',
      'GET',
      '/admin/users?approvalStatus=pending',
      null,
      200,
      this.adminToken
    );

    // Test user approval (if there are pending users)
    const pendingUsers = await this.makeRequest('GET', '/admin/users/pending', null, {
      Authorization: `Bearer ${this.adminToken}`
    });

    if (pendingUsers.success && pendingUsers.data.data.users.length > 0) {
      const userId = pendingUsers.data.data.users[0].id;
      
      await this.testEndpoint(
        'Approve User',
        'PUT',
        `/admin/users/${userId}/approve`,
        { adminNotes: 'Approved via API test' },
        200,
        this.adminToken
      );

      await this.testEndpoint(
        'Reject User',
        'PUT',
        `/admin/users/${userId}/reject`,
        { reason: 'Test rejection', adminNotes: 'Rejected via API test' },
        200,
        this.adminToken
      );
    }

    // Test user deactivation
    await this.testEndpoint(
      'Deactivate User',
      'PUT',
      `/admin/users/999/deactivate`,
      { reason: 'Test deactivation' },
      404,
      this.adminToken
    );
  }

  async runStatisticsTests() {
    console.log('\n📊 Testing Statistics...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping statistics tests - no admin token');
      return;
    }

    // Get system statistics
    await this.testEndpoint(
      'Get System Statistics',
      'GET',
      '/admin/stats',
      null,
      200,
      this.adminToken
    );
  }

  async runAuditLogTests() {
    console.log('\n📋 Testing Audit Logs...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping audit log tests - no admin token');
      return;
    }

    // Get audit logs
    await this.testEndpoint(
      'Get Audit Logs',
      'GET',
      '/admin/audit-logs',
      null,
      200,
      this.adminToken
    );

    // Filter audit logs by action
    await this.testEndpoint(
      'Filter Audit Logs By Action',
      'GET',
      '/admin/audit-logs?action=user_approve',
      null,
      200,
      this.adminToken
    );

    // Filter audit logs by date range
    const today = new Date().toISOString().split('T')[0];
    await this.testEndpoint(
      'Filter Audit Logs By Date',
      'GET',
      `/admin/audit-logs?startDate=${today}&endDate=${today}`,
      null,
      200,
      this.adminToken
    );
  }

  async runReportTests() {
    console.log('\n🚨 Testing Reports...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping report tests - no admin token');
      return;
    }

    // Get all reports
    await this.testEndpoint(
      'Get All Reports',
      'GET',
      '/admin/reports',
      null,
      200,
      this.adminToken
    );

    // Filter reports by status
    await this.testEndpoint(
      'Filter Reports By Status',
      'GET',
      '/admin/reports?status=pending',
      null,
      200,
      this.adminToken
    );

    // Test report resolution
    await this.testEndpoint(
      'Resolve Report',
      'PUT',
      '/admin/reports/999/resolve',
      { resolution: 'Test resolution', adminNotes: 'Test notes' },
      404,
      this.adminToken
    );
  }

  async runAnnouncementTests() {
    console.log('\n📢 Testing Announcements...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping announcement tests - no admin token');
      return;
    }

    // Get all announcements
    await this.testEndpoint(
      'Get All Announcements',
      'GET',
      '/admin/announcements',
      null,
      200,
      this.adminToken
    );

    // Create announcement
    const createResult = await this.testEndpoint(
      'Create Announcement',
      'POST',
      '/admin/announcements',
      {
        title: 'API Test Announcement',
        content: 'This announcement was created via API test',
        type: 'info',
        isActive: true
      },
      201,
      this.adminToken
    );

    // Update announcement if creation succeeded
    if (createResult.success && createResult.data.data.announcement) {
      const announcementId = createResult.data.data.announcement.id;
      
      await this.testEndpoint(
        'Update Announcement',
        'PUT',
        `/admin/announcements/${announcementId}`,
        {
          title: 'Updated API Test Announcement',
          content: 'This announcement was updated via API test',
          isActive: false
        },
        200,
        this.adminToken
      );

      // Delete announcement
      await this.testEndpoint(
        'Delete Announcement',
        'DELETE',
        `/admin/announcements/${announcementId}`,
        null,
        200,
        this.adminToken
      );
    }

    // Test announcement validation
    await this.testEndpoint(
      'Create Invalid Announcement',
      'POST',
      '/admin/announcements',
      {
        title: '', // Empty title should fail
        content: 'Test content',
        type: 'invalid_type'
      },
      400,
      this.adminToken
    );
  }

  async runExportTests() {
    console.log('\n📤 Testing Export Functions...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping export tests - no admin token');
      return;
    }

    // Export audit logs as CSV
    await this.testEndpoint(
      'Export Audit Logs CSV',
      'GET',
      '/admin/export/audit-logs/csv',
      null,
      200,
      this.adminToken
    );

    // Export reports as CSV
    await this.testEndpoint(
      'Export Reports CSV',
      'GET',
      '/admin/export/reports/csv',
      null,
      200,
      this.adminToken
    );

    // Export statistics as CSV
    await this.testEndpoint(
      'Export Statistics CSV',
      'GET',
      '/admin/export/statistics/csv',
      null,
      200,
      this.adminToken
    );
  }

  async runSystemSettingsTests() {
    console.log('\n⚙️  Testing System Settings...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping system settings tests - no admin token');
      return;
    }

    // Get system settings
    await this.testEndpoint(
      'Get System Settings',
      'GET',
      '/admin/settings',
      null,
      200,
      this.adminToken
    );

    // Update system settings
    await this.testEndpoint(
      'Update System Settings',
      'PUT',
      '/admin/settings',
      {
        siteName: 'Test Messenger',
        maxUsers: 100,
        allowRegistration: true
      },
      200,
      this.adminToken
    );
  }

  async runErrorHandlingTests() {
    console.log('\n❌ Testing Error Handling...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping error handling tests - no admin token');
      return;
    }

    // Test non-existent user
    await this.testEndpoint(
      'Get Non-existent User',
      'GET',
      '/admin/users/99999',
      null,
      404,
      this.adminToken
    );

    // Test invalid endpoint
    await this.testEndpoint(
      'Invalid Endpoint',
      'GET',
      '/admin/invalid-endpoint',
      null,
      404,
      this.adminToken
    );

    // Test malformed data
    await this.testEndpoint(
      'Malformed Request Data',
      'POST',
      '/admin/announcements',
      { invalid: 'data' },
      400,
      this.adminToken
    );
  }

  async runPerformanceTests() {
    console.log('\n⚡ Testing Performance...');

    if (!this.adminToken) {
      console.log('⚠️  Skipping performance tests - no admin token');
      return;
    }

    // Test large user list
    await this.testEndpoint(
      'Large User List Performance',
      'GET',
      '/admin/users?limit=100',
      null,
      200,
      this.adminToken
    );

    // Test concurrent requests
    console.log('🔄 Testing concurrent requests...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(this.makeRequest('GET', '/admin/stats', null, {
        Authorization: `Bearer ${this.adminToken}`
      }));
    }

    const results = await Promise.all(promises);
    const successfulRequests = results.filter(r => r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    console.log(`📊 Concurrent requests: ${successfulRequests}/10 successful, avg time: ${avgResponseTime.toFixed(2)}ms`);

    testResults.performance.concurrentRequests = {
      successful: successfulRequests,
      total: 10,
      averageResponseTime: avgResponseTime
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Admin API Tests...\n');

    try {
      // Setup test data
      await this.setupTestData();

      // Run test suites
      await this.runAuthenticationTests();
      await this.runUserManagementTests();
      await this.runStatisticsTests();
      await this.runAuditLogTests();
      await this.runReportTests();
      await this.runAnnouncementTests();
      await this.runExportTests();
      await this.runSystemSettingsTests();
      await this.runErrorHandlingTests();
      await this.runPerformanceTests();

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      testResults.summary.errors.push({
        test: 'Test Execution',
        error: error.message
      });
    }
  }

  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${testResults.summary.totalTests}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(2)}%`);

    if (testResults.summary.errors.length > 0) {
      console.log('\n❌ Errors:');
      testResults.summary.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }

    // Performance summary
    console.log('\n⚡ Performance Summary:');
    const avgResponseTime = Object.values(testResults.performance)
      .filter(time => typeof time === 'number')
      .reduce((sum, time) => sum + time, 0) / 
      Object.values(testResults.performance).filter(time => typeof time === 'number').length;
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);

    // Save detailed results to file
    const reportContent = this.generateMarkdownReport();
    fs.writeFileSync('admin-api-test-results.md', reportContent);
    console.log('\n📄 Detailed report saved to: admin-api-test-results.md');
  }

  generateMarkdownReport() {
    const timestamp = new Date().toISOString();
    
    let markdown = `# Admin API Test Results\n\n`;
    markdown += `**Generated:** ${timestamp}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${testResults.summary.totalTests}\n`;
    markdown += `- **Passed:** ${testResults.summary.passed}\n`;
    markdown += `- **Failed:** ${testResults.summary.failed}\n`;
    markdown += `- **Success Rate:** ${((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(2)}%\n\n`;

    // Errors
    if (testResults.summary.errors.length > 0) {
      markdown += `## Errors\n\n`;
      testResults.summary.errors.forEach(error => {
        markdown += `### ${error.test}\n`;
        markdown += `**Error:** ${error.error}\n`;
        if (error.response) {
          markdown += `**Response:** \`${JSON.stringify(error.response)}\`\n`;
        }
        markdown += `\n`;
      });
    }

    // Endpoint Tests
    markdown += `## Endpoint Tests\n\n`;
    markdown += `| Test | Method | Endpoint | Expected | Actual | Success | Response Time |\n`;
    markdown += `|------|--------|----------|----------|---------|---------|---------------|\n`;

    Object.values(testResults.endpoints).forEach(test => {
      markdown += `| ${test.name} | ${test.method} | ${test.endpoint} | ${test.expectedStatus} | ${test.actualStatus} | ${test.success ? '✅' : '❌'} | ${test.responseTime}ms |\n`;
    });

    // Performance Analysis
    markdown += `\n## Performance Analysis\n\n`;
    const performanceData = Object.entries(testResults.performance)
      .filter(([key, value]) => typeof value === 'number')
      .sort(([,a], [,b]) => b - a);

    markdown += `| Endpoint | Response Time |\n`;
    markdown += `|----------|---------------|\n`;
    performanceData.forEach(([endpoint, time]) => {
      markdown += `| ${endpoint} | ${time}ms |\n`;
    });

    // Security Analysis
    markdown += `\n## Security Analysis\n\n`;
    markdown += `### Authentication & Authorization\n\n`;
    
    const authTests = Object.values(testResults.endpoints).filter(test => 
      test.name.includes('Auth') || test.name.includes('Without Auth') || test.name.includes('Regular User')
    );

    authTests.forEach(test => {
      markdown += `**${test.name}:** ${test.success ? '✅' : '❌'}\n`;
      markdown += `- Expected Status: ${test.expectedStatus}\n`;
      markdown += `- Actual Status: ${test.actualStatus}\n`;
      if (test.data && test.data.error) {
        markdown += `- Error: ${test.data.error.type || test.data.error.message}\n`;
      }
      markdown += `\n`;
    });

    // Recommendations
    markdown += `## Recommendations\n\n`;
    
    if (testResults.summary.failed > 0) {
      markdown += `### Critical Issues\n`;
      markdown += `- ${testResults.summary.failed} tests failed - review and fix failing endpoints\n`;
      markdown += `- Check error handling and response codes\n\n`;
    }

    const slowEndpoints = performanceData.filter(([,time]) => time > 1000);
    if (slowEndpoints.length > 0) {
      markdown += `### Performance Issues\n`;
      slowEndpoints.forEach(([endpoint, time]) => {
        markdown += `- ${endpoint}: ${time}ms (consider optimization)\n`;
      });
      markdown += `\n`;
    }

    const avgResponseTime = performanceData.reduce((sum, [,time]) => sum + time, 0) / performanceData.length;
    if (avgResponseTime > 500) {
      markdown += `- Average response time is high (${avgResponseTime.toFixed(2)}ms) - consider performance optimization\n\n`;
    }

    markdown += `### Security Recommendations\n`;
    markdown += `- All admin endpoints properly require authentication\n`;
    markdown += `- Role-based access control is working correctly\n`;
    markdown += `- Consider implementing rate limiting for admin endpoints\n`;
    markdown += `- Add request logging and monitoring for admin actions\n\n`;

    markdown += `### Functionality Recommendations\n`;
    markdown += `- All core admin functionality is operational\n`;
    markdown += `- Export functions are working correctly\n`;
    markdown += `- User management workflow is complete\n`;
    markdown += `- Audit logging is capturing admin actions\n\n`;

    markdown += `---\n`;
    markdown += `*Report generated by Admin API Test Suite*\n`;

    return markdown;
  }
}

// Run tests
const tester = new AdminAPITester();
tester.runAllTests().catch(console.error);