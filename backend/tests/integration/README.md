# Messaging Integration Tests

Comprehensive integration test suite for messaging functionality, covering all aspects of the messenger application including real-time messaging, file handling, encryption, and database operations.

## Overview

This integration test suite provides complete coverage of the messaging system with:

- **1-to-1 and Group Messaging**: Message sending, receiving, and status tracking
- **File Upload/Download**: Complete file handling workflows with validation
- **WebSocket Integration**: Real-time message delivery and event handling
- **E2E Encryption**: Message encryption/decryption with key management
- **Database Integration**: Transaction handling and data consistency

## Test Structure

```
backend/tests/integration/
├── README.md                           # This file
├── jest-integration.config.js          # Jest configuration for integration tests
├── test-config.js                      # Test configuration and lifecycle management
├── messaging.integration.test.js       # 1-to-1 and group messaging tests
├── file-handling.integration.test.js   # File upload/download tests
├── websocket.integration.test.js       # WebSocket real-time messaging tests
├── encryption.integration.test.js      # E2E encryption tests
└── database.integration.test.js        # Database consistency and transaction tests
```

## Test Categories

### 1. Message Send/Receive Tests (`messaging.integration.test.js`)
- ✅ Send message between two users and verify delivery
- ✅ Send message in group chat and verify all members receive it
- ✅ Message status updates (sent, delivered, read)
- ✅ Message editing and deletion
- ✅ Concurrent message sending and race conditions
- ✅ Rate limiting enforcement
- ✅ Authentication and authorization checks

### 2. File Upload/Download Tests (`file-handling.integration.test.js`)
- ✅ Upload file and verify storage and accessibility
- ✅ Download file and verify integrity
- ✅ File virus scanning and security validation
- ✅ File type and size validation
- ✅ Concurrent file upload/download operations
- ✅ File cleanup and storage management

### 3. WebSocket Integration Tests (`websocket.integration.test.js`)
- ✅ WebSocket connection and real-time message delivery
- ✅ Real-time message status updates
- ✅ Group join/leave events
- ✅ Typing indicators and presence
- ✅ Connection stability and error handling
- ✅ High-frequency real-time messaging

### 4. E2E Encryption Tests (`encryption.integration.test.js`)
- ✅ Message encryption/decryption flow
- ✅ Key exchange and management
- ✅ Group encryption with shared keys
- ✅ Encryption key rotation
- ✅ Security validation and attack prevention
- ✅ Performance with encrypted messages

### 5. Database Integration Tests (`database.integration.test.js`)
- ✅ Transaction handling and rollback on failures
- ✅ Data consistency across related models
- ✅ Referential integrity maintenance
- ✅ Database performance and optimization
- ✅ Error handling and recovery scenarios

## Test Infrastructure

### Test Utilities
- **APITestUtils**: HTTP API testing utilities
- **MessagingTestHelpers**: Messaging-specific test helpers
- **WebSocketTestClient**: WebSocket testing client
- **TestDatabaseSeeder**: Database seeding and cleanup

### Test Configuration
- **Test Database**: Separate in-memory SQLite database
- **Mock Services**: Email, file storage, virus scanning
- **Test Isolation**: Complete cleanup between tests
- **Performance Monitoring**: Response time and throughput tracking

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure test database is available
npm run migrate
```

### Run All Integration Tests
```bash
# Run integration tests once
npm run test:integration

# Run with coverage
npm run test:integration:coverage

# Watch mode for development
npm run test:integration:watch
```

### Run Specific Test Categories
```bash
# Run only messaging tests
npm run test:integration -- --testPathPattern=messaging

# Run only file handling tests
npm run test:integration -- --testPathPattern=file-handling

# Run only WebSocket tests
npm run test:integration -- --testPathPattern=websocket

# Run only encryption tests
npm run test:integration -- --testPathPattern=encryption

# Run only database tests
npm run test:integration -- --testPathPattern=database
```

### Run Tests in CI/CD
```bash
# Run all tests (unit + integration) in CI
npm run test:all

# Run with coverage in CI
npm run test:all:coverage

# Run specific test with pattern
npm run test:integration -- --testNamePattern="should send and receive message"
```

## Test Data Management

### Automatic Test Data Seeding
The test suite automatically creates realistic test data:

- **Users**: 5 test users (4 regular + 1 admin)
- **Groups**: 3 test groups (2 private + 1 public)
- **Messages**: 45+ test messages (direct + group)
- **Files**: 8+ test files with different types

### Manual Test Data Creation
```javascript
// In test files
const testData = await global.testUtils.setupTestData('comprehensive');

// Access test data
const users = testData.users;
const groups = testData.groups;
const messages = testData.directMessages;
```

## Test Utilities API

### APITestUtils
```javascript
import { apiTestUtils } from '../apiTestUtils.js';

// Send message
const response = await apiTestUtils.sendMessage(authToken, {
  recipientId: userId,
  content: 'Test message',
});

// Upload file
const uploadResponse = await apiTestUtils.uploadFile(authToken, filePath);

// Get messages
const messagesResponse = await apiTestUtils.getMessages(authToken, {
  limit: 50,
  offset: 0,
});
```

### MessagingTestHelpers
```javascript
import { messagingTestHelpers } from '../messagingTestHelpers.js';

// Create test user
const user = await messagingTestHelpers.createTestUser({
  username: 'testuser',
  email: 'test@example.com',
});

// Create test group
const group = await messagingTestHelpers.createTestGroup({
  name: 'Test Group',
  createdBy: user.id,
});
```

### WebSocketTestClient
```javascript
import { webSocketTestManager } from '../websocketTestClient.js';

// Create WebSocket client
const client = await webSocketTestManager.createClient(userId, authToken);

// Wait for message
const messageEvent = await client.waitForMessage(5000);
```

## Test Configuration

### Environment Variables
```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
DATABASE_URL=sqlite::memory:
REDIS_URL=redis://localhost:6379
FILE_UPLOAD_PATH=./temp/test_uploads
```

### Test Timeouts
- **Default**: 30 seconds per test
- **WebSocket operations**: 5 seconds
- **Database operations**: 10 seconds
- **File operations**: 15 seconds

### Quality Gates
- **Minimum success rate**: 90%
- **Maximum execution time**: 5 minutes
- **No critical failures**: All tests must pass

## Test Reporting

### Coverage Reports
- **HTML Report**: `coverage/integration/lcov-report/index.html`
- **JSON Report**: `coverage/integration/coverage-final.json`
- **JUnit XML**: `coverage/integration/integration-test-results.xml`

### Test Results
```json
{
  "summary": {
    "total": 47,
    "passed": 45,
    "failed": 2,
    "duration": 125000,
    "successRate": "95.74%"
  },
  "errors": [...],
  "timestamp": "2025-10-17T21:35:00.000Z"
}
```

## Debugging Tests

### Enable Debug Logging
```bash
DEBUG=integration:* npm run test:integration
```

### Run Single Test
```bash
npm run test:integration -- --testNamePattern="should send message"
```

### Inspect Test Data
```javascript
// Add to test file for debugging
console.log('Test data:', JSON.stringify(testData, null, 2));
```

### WebSocket Debugging
```javascript
// Monitor WebSocket events
client.getEvents().forEach(event => {
  console.log('WS Event:', event.name, event.data);
});
```

## Performance Benchmarks

The integration tests include performance benchmarks:

- **Message throughput**: 100 messages/second
- **File upload speed**: 5MB files in < 2 seconds
- **WebSocket latency**: < 100ms for message delivery
- **Database query time**: < 500ms for complex queries

## Best Practices

### Test Organization
- ✅ Group related tests in describe blocks
- ✅ Use descriptive test names
- ✅ Setup and cleanup in beforeAll/afterAll
- ✅ Use realistic test data
- ✅ Test both success and failure scenarios

### Error Handling
- ✅ Test error conditions explicitly
- ✅ Verify proper error responses
- ✅ Ensure graceful degradation
- ✅ Validate error logging

### Performance Testing
- ✅ Include performance assertions
- ✅ Test with realistic data volumes
- ✅ Monitor resource usage
- ✅ Validate scalability

### Security Testing
- ✅ Test authentication/authorization
- ✅ Validate input sanitization
- ✅ Check for injection attacks
- ✅ Verify encryption implementation

## Troubleshooting

### Common Issues

**Database Connection Failures**
```bash
# Ensure migrations are run
npm run migrate

# Check database configuration
echo $DATABASE_URL
```

**WebSocket Connection Issues**
```bash
# Check if server is running
npm run dev

# Verify WebSocket endpoint
curl http://localhost:3000/health
```

**File Upload Permissions**
```bash
# Check temp directory permissions
chmod 755 temp/
```

**Memory Issues**
```bash
# Run tests with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm run test:integration
```

### Test Data Issues
```bash
# Clear test database
rm -f temp/*.db

# Regenerate test data
npm run test:integration
```

## Contributing

When adding new integration tests:

1. **Create test file** in appropriate category
2. **Add test configuration** if needed
3. **Update this README** with new test coverage
4. **Run full test suite** to ensure no regressions
5. **Update CI/CD pipeline** if necessary

## Integration with CI/CD

The integration tests are designed to run in CI/CD environments:

- ✅ Parallel execution safe
- ✅ Proper cleanup between runs
- ✅ JUnit XML reporting for CI integration
- ✅ Coverage reporting for quality gates
- ✅ Timeout handling for long-running tests

## Quality Assurance

### Test Coverage Goals
- **API Endpoints**: > 95% coverage
- **Database Operations**: > 90% coverage
- **WebSocket Events**: > 85% coverage
- **Error Scenarios**: > 80% coverage

### Performance Goals
- **Test Execution Time**: < 5 minutes
- **Memory Usage**: < 512MB
- **CPU Usage**: < 50% average
- **Network I/O**: < 100MB per test run

This integration test suite ensures the messaging functionality is robust, secure, and performant across all components and integration points.