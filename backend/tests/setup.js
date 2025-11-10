import { jest } from '@jest/globals';
import { config } from '../src/config/index.js';
import { testDatabaseSeeder } from './testDatabaseSeeder.js';
import { messagingTestHelpers } from './messagingTestHelpers.js';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.FILE_UPLOAD_PATH = './temp/test_uploads';

// Configure test database
config.database.url = 'sqlite::memory:';
config.database.dialect = 'sqlite';
config.jwt.secret = 'test-jwt-secret-key';
config.jwt.refreshSecret = 'test-jwt-refresh-secret-key';
config.session.secret = 'test-session-secret';

// Global test utilities
global.testUtils = {
  // Database seeder
  seeder: testDatabaseSeeder,

  // Messaging test helpers
  messaging: messagingTestHelpers,

  // Generate test user data
  createTestUser: (overrides = {}) => ({
    username: `testuser${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  }),

  // Generate test admin data
  createTestAdmin: (overrides = {}) => ({
    username: `admin${Date.now()}`,
    email: `admin${Date.now()}@example.com`,
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    approvalStatus: 'approved',
    emailVerified: true,
    ...overrides,
  }),

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean up test files
  cleanupTestFiles: async (files) => {
    if (Array.isArray(files)) {
      for (const file of files) {
        try {
          const fs = await import('fs/promises');
          await fs.unlink(file);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  },

  // Setup comprehensive test data for integration tests
  setupTestData: async (type = 'minimal') => {
    try {
      if (type === 'comprehensive') {
        return await testDatabaseSeeder.seedComprehensiveData();
      } else {
        return await testDatabaseSeeder.seedMinimalData();
      }
    } catch (error) {
      console.error('Error setting up test data:', error);
      throw error;
    }
  },

  // Cleanup all test data
  cleanupTestData: async () => {
    try {
      await testDatabaseSeeder.cleanup();
      await messagingTestHelpers.cleanup();
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  },
};

// Enhanced Jest configuration for integration tests
// Note: jest.setTimeout should be set in individual test files in ESM mode
// jest.setTimeout(30000); // Increased timeout for integration tests

// Global test hooks for integration tests
// Note: Global hooks should be set in individual test files in ESM mode
// global.beforeAll(async () => {
//   // Database is already initialized by models/index.js
//   console.log('🧪 Integration tests starting...');
// });

// global.afterAll(async () => {
//   // Cleanup test data after all tests
//   await global.testUtils.cleanupTestData();
//   console.log('✅ Integration tests completed');
// });

global.beforeEach(async () => {
  // Clean slate for each test
  // jest.clearAllMocks(); // Commented out for ESM compatibility
});

global.afterEach(async () => {
  // Cleanup after each test
  await global.testUtils.cleanupTestData();
});