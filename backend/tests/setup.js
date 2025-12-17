import { jest } from '@jest/globals';
import { config } from '../src/config/index.js';
import { sequelize } from '../src/config/database.js';
import { testDatabaseSeeder } from './testDatabaseSeeder.js';
import { messagingTestHelpers } from './messagingTestHelpers.js';
import { testFactory } from './testFactory.js';

// Mock isomorphic-dompurify to avoid parse5 ES module issues
jest.unstable_mockModule('isomorphic-dompurify', () => ({
  default: {
    sanitize: (input) => input, // Pass-through sanitization for tests
  },
}));

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.FILE_UPLOAD_PATH = './temp/test_uploads';

// Configure test settings
config.jwt.secret = 'test-jwt-secret-key';
config.jwt.refreshSecret = 'test-jwt-refresh-secret-key';
config.session.secret = 'test-session-secret';

// Initialize database connection
let dbInitialized = false;
async function initializeTestDatabase() {
  if (dbInitialized) return;

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Test database connected');

    // Note: Tables should already exist from migrations
    // We don't call sync() to avoid conflicts with migration-created schema

    dbInitialized = true;
  } catch (error) {
    console.error('❌ Test database initialization failed:', error.message);
    throw error;
  }
}

// Global test utilities
global.testUtils = {
  // Test factory (recommended for new tests)
  factory: testFactory,

  // Database seeder
  seeder: testDatabaseSeeder,

  // Messaging test helpers
  messaging: messagingTestHelpers,

  // Generate test user data (legacy - use factory instead)
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
      await testFactory.cleanup();
      await testDatabaseSeeder.cleanup();
      await messagingTestHelpers.cleanup();
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  },

  // Initialize test database
  initDatabase: initializeTestDatabase,

  // Clear all database tables (for resetting between tests)
  async clearDatabase() {
    try {
      const models = Object.values(sequelize.models);

      // Disable foreign key checks temporarily
      await sequelize.query('SET CONSTRAINTS ALL DEFERRED');

      // Delete all data from tables
      for (const model of models) {
        await model.destroy({ where: {}, force: true, truncate: true });
      }

      // Re-enable foreign key checks
      await sequelize.query('SET CONSTRAINTS ALL IMMEDIATE');
    } catch (error) {
      console.error('Error clearing database:', error);
    }
  },
};

// Initialize database before any tests run
beforeAll(async () => {
  await initializeTestDatabase();
});

// Clean up after each test to prevent data pollution
afterEach(async () => {
  await global.testUtils.cleanupTestData();
});