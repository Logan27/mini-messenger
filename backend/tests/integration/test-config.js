import { testDatabaseSeeder } from '../testDatabaseSeeder.js';
import { messagingTestHelpers } from '../messagingTestHelpers.js';
import { webSocketTestManager } from '../websocketTestClient.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Comprehensive test configuration for integration tests
 * Handles setup, teardown, isolation, and cleanup procedures
 */
export class IntegrationTestConfig {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      startTime: null,
      endTime: null,
      duration: 0,
    };

    this.testFiles = [];
    this.tempDirectories = [];
    this.cleanupFunctions = [];
  }

  /**
   * Initialize test environment before all tests
   */
  async initialize() {
    console.log('🚀 Initializing integration test environment...');

    this.testResults.startTime = new Date();

    try {
      // Create necessary directories
      await this.createTestDirectories();

      // Setup test database
      await this.setupTestDatabase();

      // Initialize external services (mocks)
      await this.initializeMocks();

      console.log('✅ Integration test environment initialized');
    } catch (error) {
      console.error('❌ Failed to initialize test environment:', error);
      throw error;
    }
  }

  /**
   * Cleanup test environment after all tests
   */
  async cleanup() {
    console.log('🧹 Cleaning up integration test environment...');

    this.testResults.endTime = new Date();
    this.testResults.duration = this.testResults.endTime - this.testResults.startTime;

    try {
      // Run custom cleanup functions
      for (const cleanupFn of this.cleanupFunctions) {
        try {
          await cleanupFn();
        } catch (error) {
          console.error('Error in cleanup function:', error);
        }
      }

      // Cleanup test files and directories
      await this.cleanupTestFiles();

      // Cleanup database
      await this.cleanupTestDatabase();

      // Cleanup WebSocket connections
      webSocketTestManager.disconnectAll();

      // Generate test report
      await this.generateTestReport();

      console.log('✅ Integration test environment cleanup completed');
    } catch (error) {
      console.error('❌ Error during test environment cleanup:', error);
    }
  }

  /**
   * Setup for each individual test
   */
  async setupTest(testName) {
    console.log(`🧪 Setting up test: ${testName}`);

    // Reset database to clean state
    await testDatabaseSeeder.cleanup();

    // Clear WebSocket events
    for (const client of webSocketTestManager.getConnectedClients()) {
      client.clear();
    }

    // Reset any mocks
    await this.resetMocks();
  }

  /**
   * Teardown after each individual test
   */
  async teardownTest(testName, result) {
    console.log(`🏁 Tearing down test: ${testName}`);

    if (result === 'passed') {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
      this.testResults.errors.push({
        testName,
        error: result,
        timestamp: new Date(),
      });
    }

    // Cleanup any test-specific data
    await this.cleanupTestSpecificData(testName);
  }

  /**
   * Create necessary test directories
   */
  async createTestDirectories() {
    const directories = [
      path.join(process.cwd(), 'temp'),
      path.join(process.cwd(), 'temp', 'test_uploads'),
      path.join(process.cwd(), 'temp', 'test_downloads'),
      path.join(process.cwd(), 'coverage'),
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        this.tempDirectories.push(dir);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Setup test database with proper isolation
   */
  async setupTestDatabase() {
    // Database is already configured to use in-memory SQLite
    // Run migrations if needed
    try {
      const { sequelize } = await import('../../src/config/database.js');
      await sequelize.authenticate();
      console.log('✅ Test database connection established');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Initialize external service mocks
   */
  async initializeMocks() {
    // Mock email service
    this.mockEmailService();

    // Mock file storage service
    this.mockFileStorageService();

    // Mock virus scanning service
    this.mockVirusScanningService();

    // Mock external APIs
    this.mockExternalAPIs();
  }

  /**
   * Reset mocks for each test
   */
  async resetMocks() {
    // Reset email service mock
    if (global.emailServiceMock) {
      global.emailServiceMock.reset();
    }

    // Reset file storage mock
    if (global.fileStorageMock) {
      global.fileStorageMock.reset();
    }

    // Reset virus scanning mock
    if (global.virusScanMock) {
      global.virusScanMock.reset();
    }
  }

  /**
   * Mock email service for testing
   */
  mockEmailService() {
    global.emailServiceMock = {
      sentEmails: [],
      sendEmail: async (to, subject, body) => {
        global.emailServiceMock.sentEmails.push({ to, subject, body, timestamp: new Date() });
        return { success: true, messageId: `mock-${Date.now()}` };
      },
      reset: () => {
        global.emailServiceMock.sentEmails = [];
      },
      getSentEmails: () => global.emailServiceMock.sentEmails,
    };
  }

  /**
   * Mock file storage service for testing
   */
  mockFileStorageService() {
    global.fileStorageMock = {
      uploadedFiles: [],
      uploadFile: async (file, destination) => {
        const fileInfo = {
          originalName: file.name,
          destination,
          size: file.size,
          uploadedAt: new Date(),
        };
        global.fileStorageMock.uploadedFiles.push(fileInfo);
        return { success: true, path: destination };
      },
      deleteFile: async (path) => {
        global.fileStorageMock.uploadedFiles = global.fileStorageMock.uploadedFiles.filter(
          f => f.destination !== path
        );
        return { success: true };
      },
      reset: () => {
        global.fileStorageMock.uploadedFiles = [];
      },
      getUploadedFiles: () => global.fileStorageMock.uploadedFiles,
    };
  }

  /**
   * Mock virus scanning service for testing
   */
  mockVirusScanningService() {
    global.virusScanMock = {
      scanResults: [],
      scanFile: async (filePath) => {
        const result = {
          filePath,
          status: 'clean',
          scannedAt: new Date(),
          threats: [],
        };
        global.virusScanMock.scanResults.push(result);
        return result;
      },
      reset: () => {
        global.virusScanMock.scanResults = [];
      },
      getScanResults: () => global.virusScanMock.scanResults,
    };
  }

  /**
   * Mock external APIs for testing
   */
  mockExternalAPIs() {
    global.externalAPIMock = {
      requests: [],
      makeRequest: async (url, method, data) => {
        global.externalAPIMock.requests.push({ url, method, data, timestamp: new Date() });
        return { success: true, data: { mock: true } };
      },
      reset: () => {
        global.externalAPIMock.requests = [];
      },
      getRequests: () => global.externalAPIMock.requests,
    };
  }

  /**
   * Cleanup test files and directories
   */
  async cleanupTestFiles() {
    for (const dir of this.tempDirectories) {
      try {
        // Recursively delete directory contents
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
            await fs.unlink(filePath);
          } catch (error) {
            // Ignore errors for files that don't exist
          }
        }
      } catch (error) {
        // Ignore errors for directories that don't exist
      }
    }
  }

  /**
   * Cleanup test database
   */
  async cleanupTestDatabase() {
    try {
      await testDatabaseSeeder.cleanup();
      console.log('✅ Test database cleanup completed');
    } catch (error) {
      console.error('❌ Error during database cleanup:', error);
    }
  }

  /**
   * Cleanup test-specific data
   */
  async cleanupTestSpecificData(testName) {
    // Add test-specific cleanup logic here
    // For example, cleanup specific files or data created by a particular test
  }

  /**
   * Add custom cleanup function
   */
  addCleanupFunction(fn) {
    this.cleanupFunctions.push(fn);
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    const report = {
      summary: {
        total: this.testResults.passed + this.testResults.failed,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        duration: this.testResults.duration,
        successRate: ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(2) + '%',
      },
      errors: this.testResults.errors,
      timestamp: new Date().toISOString(),
    };

    // Save report to file
    const reportPath = path.join(process.cwd(), 'coverage', 'integration-test-report.json');
    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Test report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Error saving test report:', error);
    }

    // Log summary
    console.log('\n📊 Integration Test Summary:');
    console.log(`Total tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success rate: ${report.summary.successRate}`);
    console.log(`Duration: ${report.summary.duration}ms`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error.testName}: ${error.error.message || error.error}`);
      });
    }

    return report;
  }

  /**
   * Get test statistics
   */
  getTestStats() {
    return { ...this.testResults };
  }

  /**
   * Check if tests are passing quality gates
   */
  checkQualityGates() {
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? (this.testResults.passed / total) * 100 : 0;

    const gates = {
      minimumSuccessRate: successRate >= 90,
      noCriticalFailures: !this.testResults.errors.some(e => e.critical),
      maximumDuration: this.testResults.duration < 300000, // 5 minutes
    };

    return {
      overall: Object.values(gates).every(g => g),
      gates,
      successRate,
    };
  }
}

// Global test configuration instance
export const integrationTestConfig = new IntegrationTestConfig();

// Jest global setup
export const setupIntegrationTests = async () => {
  await integrationTestConfig.initialize();
};

// Jest global teardown
export const teardownIntegrationTests = async () => {
  await integrationTestConfig.cleanup();
};

// Test environment validation
export const validateTestEnvironment = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Test environment validation passed');
};

// Test data validation
export const validateTestData = (testData) => {
  if (!testData.users || testData.users.length === 0) {
    throw new Error('Test data must include users');
  }

  if (!testData.groups || testData.groups.length === 0) {
    throw new Error('Test data must include groups');
  }

  console.log('✅ Test data validation passed');
};