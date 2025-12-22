export default {
  testEnvironment: 'node',
  testTimeout: 30000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
  ],
  // No transform needed with experimental-vm-modules
  transform: {},
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  // Module directories
  moduleDirectories: ['node_modules', 'src'],
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/tests/integration/',
    '/tests/integration.skip/',
  ],
  // Clear mocks between tests
  clearMocks: true,
  // Restore mocks between tests
  restoreMocks: true,
  // Force exit to prevent hanging on background jobs
  forceExit: true,
  // Detect open handles
  detectOpenHandles: false,
};
