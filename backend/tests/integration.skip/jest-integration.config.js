import { setupIntegrationTests, teardownIntegrationTests } from './test-config.js';

/**
 * Jest configuration specifically for integration tests
 */
export default {
  // Test environment
  testEnvironment: 'node',
  testMatch: [
    '**/tests/integration/**/*.test.js',
  ],

  // Setup and teardown
  setupFilesAfterEnv: [
    '../../tests/setup.js',
  ],

  // Global setup
  globalSetup: async () => {
    await setupIntegrationTests();
  },

  // Global teardown
  globalTeardown: async () => {
    await teardownIntegrationTests();
  },

  // Test timeout
  testTimeout: 30000,

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/config/**',
    '!src/migrations/**',
    '!src/models/index.js',
  ],

  coverageDirectory: 'coverage/integration',
  coverageReporters: [
    'text',
    'html',
    'json',
    'lcov',
  ],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/integration',
      outputName: 'integration-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
  ],

  // Verbose output for integration tests
  verbose: true,

  // Force exit to ensure cleanup
  forceExit: true,

  // Detect open handles (important for WebSocket tests)
  detectOpenHandles: true,

  // Bail out after first test failure in CI
  bail: process.env.CI ? 1 : 0,

  // Parallel test execution (disabled for integration tests to avoid conflicts)
  maxWorkers: 1,

  // Test name pattern
  testNamePattern: process.env.TEST_NAME_PATTERN || '',

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // No transform needed with experimental-vm-modules
  transform: {},

  // Module directories
  moduleDirectories: ['node_modules', 'src'],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,
};