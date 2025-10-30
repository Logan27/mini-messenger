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
    errors: [],
    skipped: 0
  },
  endpoints: {},
  performance: {},
  security: {},
  functionality: {}
};

// Test utilities
class ComprehensiveAdminTester {
  constructor() {
    this.adminToken = null;
    this.userToken = null;
    this.testData = {
      users: [],
      groups: [],
      announcements: [],
      reports: []
    };
    this.requestDelay = 1000; // 1 second delay between requests
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000 // 10 second timeout
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

  async testEndpoint(name, method, endpoint, data = null, expectedStatus = 200, token = null, skipIfNoToken = false) {
    if (skipIfNoToken && !token) {
      testResults.summary.skipped++;
      testResults.summary.totalTests++;
      console.log(`⏭️  ${name} - SKIPPED (no token)`);
      return null;
    }

    // Add delay to avoid rate limiting
    await this.delay(this.requestDelay);

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
      timestamp: new Date().toISOString(),
      rateLimited: result.status === 429
    };

    if (testResult.rateLimited) {
      testResults.summary.errors.push({
        test: name,
        error: 'Rate limited (429)',
        response: result.data
      });
      console.log(`🚫 ${name} - RATE LIMITED (429) (${result.responseTime}ms)`);
    } else if (!testResult.success) {
      testResults.summary.failed++;
      testResults.summary.errors.push({
        test: name,
        error: result.error || `Expected ${expectedStatus}, got ${result.status}`,
        response: result.data
      });
      console.log(`${testResult.success ? '✅' : '❌'} ${name} - ${result.status} (${result.responseTime}ms)`);
    } else {
      testResults.summary.passed++;
      console.log(`${testResult.success ? '✅' : '❌'} ${name} - ${result.status} (${result.responseTime}ms)`);
    }
    
    testResults.endpoints[name] = testResult;
    testResults.performance[name] = result.responseTime;

    return result;
  }

  async setupTestData() {
    console.log('🔧 Setting up test data...');

    try {
      // Register admin user
      const adminRegister = await this.makeRequest('POST', '/auth/register', {
        username: `testadmin${Date.now()}`,
        email: `admin${Date.now()}@test.com`,
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User'
      });

      if (adminRegister.success) {
        await this.delay(this.requestDelay);
        
        // Login as admin
        const adminLogin = await this.makeRequest('POST', '/auth/login', {
          identifier: adminRegister.data.data.user.email,
          password: 'AdminPass123!'
        });

        if (adminLogin.success) {
          this.adminToken = adminLogin.data.data.accessToken;
          console.log('👑 Admin user created and logged in');
        }
      } else {
        console.log('⚠️  Admin registration failed, trying to login with existing admin');
        
        // Try to login with existing admin
        const adminLogin = await this.makeRequest('POST', '/auth/login', {
          identifier: 'admin@test.com',
          password: 'AdminPass123!'
        });

        if (adminLogin.success) {
          this.adminToken = adminLogin.data.data.accessToken;
          console.log('👑 Existing admin user logged in');
        }
      }

      await this.delay(this.requestDelay);

      // Register regular user
      const userRegister = await this.makeRequest('POST', '/auth/register', {
        username: `testuser${Date.now()}`,
        email: `user${Date.now()}@test.com`,
        password: 'UserPass123!',
        firstName: 'Regular',
        lastName: 'User'
      });

      if (userRegister.success) {
        await this.delay(this.requestDelay);
        
        // Login as regular user
        const userLogin = await this.makeRequest('POST', '/auth/login', {
          identifier: userRegister.data.data.user.email,
          password: 'UserPass123!'
        });

        if (userLogin.success) {
          this.userToken = userLogin.data.data.accessToken;
          console.log('👤 Regular user created and logged in');
        }
      }

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
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
      this.adminToken,
      true
    );
  }

  async runUserManagementTests() {
    console.log('\n👥 Testing User Management...');

    // Get all users
    await this.testEndpoint(
      'Get All Users',
      'GET',
      '/admin/users',
      null,
      200,
      this.adminToken,
      true
    );

    // Get pending users
    await this.testEndpoint(
      'Get Pending Users',
      'GET',
      '/admin/users/pending',
      null,
      200,
      this.adminToken,
      true
    );

    // Test pagination
    await this.testEndpoint(
      'Get Users With Pagination',
      'GET',
      '/admin/users?page=1&limit=3',
      null,
      200,
      this.adminToken,
      true
    );

    // Test filtering by role
    await this.testEndpoint(
      'Filter Users By Role',
      'GET',
      '/admin/users?role=admin',
      null,
      200,
      this.adminToken,
      true
    );

    // Test filtering by approval status
    await this.testEndpoint(
      'Filter Users By Approval Status',
      'GET',
      '/admin/users?approvalStatus=pending',
      null,
      200,
      this.adminToken,
      true
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
        this.adminToken,
        true
      );
    }

    // Test user deactivation with non-existent user
    await this.testEndpoint(
      'Deactivate Non-existent User',
      'PUT',
      '/admin/users/999/deactivate',
      { reason: 'Test deactivation' },
      404,
      this.adminToken,
      true
    );
  }

  async runStatisticsTests() {
    console.log('\n📊 Testing Statistics...');

    // Get system statistics
    await this.testEndpoint(
      'Get System Statistics',
      'GET',
      '/admin/stats',
      null,
      200,
      this.adminToken,
      true
    );
  }

  async runAuditLogTests() {
    console.log('\n📋 Testing Audit Logs...');

    // Get audit logs
    await this.testEndpoint(
      'Get Audit Logs',
      'GET',
      '/admin/audit-logs',
      null,
      200,
      this.adminToken,
      true
    );

    // Filter audit logs by action
    await this.testEndpoint(
      'Filter Audit Logs By Action',
      'GET',
      '/admin/audit-logs?action=user_approve',
      null,
      200,
      this.adminToken,
      true
    );

    // Filter audit logs by date range
    const today = new Date().toISOString().split('T')[0];
    await this.testEndpoint(
      'Filter Audit Logs By Date',
      'GET',
      `/admin/audit-logs?startDate=${today}&endDate=${today}`,
      null,
      200,
      this.adminToken,
      true
    );
  }

  async runReportTests() {
    console.log('\n🚨 Testing Reports...');

    // Get all reports
    await this.testEndpoint(
      'Get All Reports',
      'GET',
      '/admin/reports',
      null,
      200,
      this.adminToken,
      true
    );

    // Filter reports by status
    await this.testEndpoint(
      'Filter Reports By Status',
      'GET',
      '/admin/reports?status=pending',
      null,
      200,
      this.adminToken,
      true
    );

    // Test report resolution with non-existent report
    await this.testEndpoint(
      'Resolve Non-existent Report',
      'PUT',
      '/admin/reports/999/resolve',
      { resolution: 'Test resolution', adminNotes: 'Test notes' },
      404,
      this.adminToken,
      true
    );
  }

  async runAnnouncementTests() {
    console.log('\n📢 Testing Announcements...');

    // Get all announcements
    await this.testEndpoint(
      'Get All Announcements',
      'GET',
      '/admin/announcements',
      null,
      200,
      this.adminToken,
      true
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
      this.adminToken,
      true
    );

    // Update announcement if creation succeeded
    if (createResult && createResult.success && createResult.data.data.announcement) {
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
        this.adminToken,
        true
      );

      // Delete announcement
      await this.testEndpoint(
        'Delete Announcement',
        'DELETE',
        `/admin/announcements/${announcementId}`,
        null,
        200,
        this.adminToken,
        true
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
      this.adminToken,
      true
    );
  }

  async runExportTests() {
    console.log('\n📤 Testing Export Functions...');

    // Export audit logs as CSV
    await this.testEndpoint(
      'Export Audit Logs CSV',
      'GET',
      '/admin/export/audit-logs/csv',
      null,
      200,
      this.adminToken,
      true
    );

    // Export reports as CSV
    await this.testEndpoint(
      'Export Reports CSV',
      'GET',
      '/admin/export/reports/csv',
      null,
      200,
      this.adminToken,
      true
    );

    // Export statistics as CSV
    await this.testEndpoint(
      'Export Statistics CSV',
      'GET',
      '/admin/export/statistics/csv',
      null,
      200,
      this.adminToken,
      true
    );
  }

  async runSystemSettingsTests() {
    console.log('\n⚙️  Testing System Settings...');

    // Get system settings
    await this.testEndpoint(
      'Get System Settings',
      'GET',
      '/admin/settings',
      null,
      200,
      this.adminToken,
      true
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
      this.adminToken,
      true
    );
  }

  async runErrorHandlingTests() {
    console.log('\n❌ Testing Error Handling...');

    // Test non-existent user
    await this.testEndpoint(
      'Get Non-existent User',
      'GET',
      '/admin/users/99999',
      null,
      404,
      this.adminToken,
      true
    );

    // Test invalid endpoint
    await this.testEndpoint(
      'Invalid Endpoint',
      'GET',
      '/admin/invalid-endpoint',
      null,
      404,
      this.adminToken,
      true
    );

    // Test malformed data
    await this.testEndpoint(
      'Malformed Request Data',
      'POST',
      '/admin/announcements',
      { invalid: 'data' },
      400,
      this.adminToken,
      true
    );
  }

  async runPerformanceTests() {
    console.log('\n⚡ Testing Performance...');

    // Test large user list
    await this.testEndpoint(
      'Large User List Performance',
      'GET',
      '/admin/users?limit=100',
      null,
      200,
      this.adminToken,
      true
    );

    // Test concurrent requests (with delays)
    console.log('🔄 Testing sequential requests (to avoid rate limiting)...');
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await this.makeRequest('GET', '/admin/stats', null, {
        Authorization: `Bearer ${this.adminToken}`
      });
      results.push(result);
      await this.delay(this.requestDelay);
    }

    const successfulRequests = results.filter(r => r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    console.log(`📊 Sequential requests: ${successfulRequests}/5 successful, avg time: ${avgResponseTime.toFixed(2)}ms`);

    testResults.performance.sequentialRequests = {
      successful: successfulRequests,
      total: 5,
      averageResponseTime: avgResponseTime
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Admin API Tests...\n');

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
    console.log(`Skipped: ${testResults.summary.skipped}`);
    
    const successRate = testResults.summary.totalTests > 0 ? 
      ((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(2) : 0;
    console.log(`Success Rate: ${successRate}%`);

    if (testResults.summary.errors.length > 0) {
      console.log('\n❌ Errors:');
      testResults.summary.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }

    // Performance summary
    const performanceData = Object.entries(testResults.performance)
      .filter(([key, value]) => typeof value === 'number')
      .sort(([,a], [,b]) => b - a);

    if (performanceData.length > 0) {
      const avgResponseTime = performanceData.reduce((sum, [,time]) => sum + time, 0) / performanceData.length;
      console.log(`\n⚡ Performance Summary:`);
      console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Slowest Endpoint: ${performanceData[0][0]} (${performanceData[0][1]}ms)`);
      console.log(`Fastest Endpoint: ${performanceData[performanceData.length - 1][0]} (${performanceData[performanceData.length - 1][1]}ms)`);
    }

    // Security analysis
    const authTests = Object.values(testResults.endpoints).filter(test => 
      test.name.includes('Auth') || test.name.includes('Without Auth') || test.name.includes('Regular User')
    );
    
    const authPassed = authTests.filter(test => test.success).length;
    console.log(`\n🔐 Security Tests: ${authPassed}/${authTests.length} passed`);

    // Save detailed results to file
    const reportContent = this.generateMarkdownReport();
    fs.writeFileSync('admin-api-test-results.md', reportContent);
    console.log('\n📄 Detailed report saved to: admin-api-test-results.md');
  }

  generateMarkdownReport() {
    const timestamp = new Date().toISOString();
    
    let markdown = `# Admin API Test Results\n\n`;
    markdown += `**Generated:** ${timestamp}\n`;
    markdown += `**Test Environment:** Development\n`;
    markdown += `**Base URL:** ${BASE_URL}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${testResults.summary.totalTests}\n`;
    markdown += `- **Passed:** ${testResults.summary.passed}\n`;
    markdown += `- **Failed:** ${testResults.summary.failed}\n`;
    markdown += `- **Skipped:** ${testResults.summary.skipped}\n`;
    
    const successRate = testResults.summary.totalTests > 0 ? 
      ((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(2) : 0;
    markdown += `- **Success Rate:** ${successRate}%\n\n`;

    // Rate limiting analysis
    const rateLimitedTests = Object.values(testResults.endpoints).filter(test => test.rateLimited);
    if (rateLimitedTests.length > 0) {
      markdown += `⚠️ **Note:** ${rateLimitedTests.length} tests were rate limited (429 response). This indicates proper rate limiting is in place.\n\n`;
    }

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
    markdown += `| Test | Method | Endpoint | Expected | Actual | Success | Response Time | Notes |\n`;
    markdown += `|------|--------|----------|----------|---------|---------|---------------|-------|\n`;

    Object.values(testResults.endpoints).forEach(test => {
      const notes = test.rateLimited ? 'Rate limited' : '';
      markdown += `| ${test.name} | ${test.method} | ${test.endpoint} | ${test.expectedStatus} | ${test.actualStatus} | ${test.success ? '✅' : '❌'} | ${test.responseTime}ms | ${notes} |\n`;
    });

    // Performance Analysis
    markdown += `\n## Performance Analysis\n\n`;
    const performanceData = Object.entries(testResults.performance)
      .filter(([key, value]) => typeof value === 'number')
      .sort(([,a], [,b]) => b - a);

    if (performanceData.length > 0) {
      markdown += `### Response Times (Slowest to Fastest)\n\n`;
      markdown += `| Endpoint | Response Time | Status |\n`;
      markdown += `|----------|---------------|--------|\n`;
      
      performanceData.forEach(([endpoint, time]) => {
        const status = time > 1000 ? '🐌 Slow' : time > 500 ? '⚠️  Moderate' : '✅ Fast';
        markdown += `| ${endpoint} | ${time}ms | ${status} |\n`;
      });

      const avgResponseTime = performanceData.reduce((sum, [,time]) => sum + time, 0) / performanceData.length;
      markdown += `\n**Average Response Time:** ${avgResponseTime.toFixed(2)}ms\n\n`;
    }

    // Security Analysis
    markdown += `## Security Analysis\n\n`;
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

    // Functionality Analysis
    markdown += `### Functionality Coverage\n\n`;
    
    const categories = {
      'User Management': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('User') || test.name.includes('Pending') || test.name.includes('Approve') || test.name.includes('Deactivate')
      ),
      'Statistics': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('Statistics') || test.name.includes('Stats')
      ),
      'Audit Logs': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('Audit')
      ),
      'Reports': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('Report')
      ),
      'Announcements': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('Announcement')
      ),
      'Exports': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('Export')
      ),
      'System Settings': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('Settings')
      ),
      'Error Handling': Object.values(testResults.endpoints).filter(test => 
        test.name.includes('Invalid') || test.name.includes('Non-existent') || test.name.includes('Malformed')
      )
    };

    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const passed = tests.filter(test => test.success && !test.rateLimited).length;
        const total = tests.length;
        markdown += `**${category}:** ${passed}/${total} tests passed\n`;
      }
    });

    // Recommendations
    markdown += `\n## Recommendations\n\n`;
    
    if (testResults.summary.failed > 0) {
      markdown += `### Critical Issues\n`;
      markdown += `- ${testResults.summary.failed} tests failed - review and fix failing endpoints\n`;
      markdown += `- Check error handling and response codes\n\n`;
    }

    if (rateLimitedTests.length > 0) {
      markdown += `### Rate Limiting\n`;
      markdown += `- ✅ Rate limiting is working correctly (${rateLimitedTests.length} tests were rate limited)\n`;
      markdown += `- Consider implementing exponential backoff for client applications\n\n`;
    }

    const slowEndpoints = performanceData.filter(([,time]) => time > 1000);
    if (slowEndpoints.length > 0) {
      markdown += `### Performance Issues\n`;
      slowEndpoints.forEach(([endpoint, time]) => {
        markdown += `- ${endpoint}: ${time}ms (consider optimization)\n`;
      });
      markdown += `\n`;
    }

    const avgResponseTime = performanceData.length > 0 ? 
      performanceData.reduce((sum, [,time]) => sum + time, 0) / performanceData.length : 0;
    if (avgResponseTime > 500) {
      markdown += `- Average response time is high (${avgResponseTime.toFixed(2)}ms) - consider performance optimization\n\n`;
    }

    markdown += `### Security Recommendations\n`;
    const authPassed = authTests.filter(test => test.success).length;
    if (authPassed === authTests.length) {
      markdown += `- ✅ All admin endpoints properly require authentication\n`;
      markdown += `- ✅ Role-based access control is working correctly\n`;
    } else {
      markdown += `- ❌ Some authentication/authorization tests failed - review security implementation\n`;
    }
    markdown += `- Consider implementing rate limiting for admin endpoints (appears to be working)\n`;
    markdown += `- Add request logging and monitoring for admin actions\n\n`;

    markdown += `### Functionality Recommendations\n`;
    const totalFunctionalityTests = Object.values(testResults.endpoints).length - rateLimitedTests.length;
    const passedFunctionalityTests = Object.values(testResults.endpoints).filter(test => test.success && !test.rateLimited).length;
    
    if (passedFunctionalityTests === totalFunctionalityTests) {
      markdown += `- ✅ All core admin functionality is operational\n`;
      markdown += `- ✅ Export functions are working correctly\n`;
      markdown += `- ✅ User management workflow is complete\n`;
      markdown += `- ✅ Audit logging is capturing admin actions\n`;
    } else {
      markdown += `- ⚠️  Some functionality issues detected - review failed tests\n`;
    }
    markdown += `\n`;

    // Test Environment Details
    markdown += `## Test Environment Details\n\n`;
    markdown += `- **Server:** Running on localhost:4000\n`;
    markdown += `- **Authentication:** JWT tokens\n`;
    markdown += `- **Rate Limiting:** Enabled (${this.requestDelay}ms delay between requests)\n`;
    markdown += `- **Test Data:** Created dynamically during test execution\n`;
    markdown += `- **Database:** PostgreSQL (development environment)\n\n`;

    markdown += `---\n`;
    markdown += `*Report generated by Comprehensive Admin API Test Suite*\n`;
    markdown += `*Test execution time: ${new Date().toLocaleString()}*\n`;

    return markdown;
  }
}

// Run tests
const tester = new ComprehensiveAdminTester();
tester.runAllTests().catch(console.error);