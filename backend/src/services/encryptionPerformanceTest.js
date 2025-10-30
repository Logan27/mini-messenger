import { logger } from '../config/index.js';

import encryptionService from './encryptionService.js';

/**
 * Performance testing service for encryption operations
 * Ensures encryption/decryption overhead <50ms per message
 */
class EncryptionPerformanceTest {
  constructor() {
    this.testResults = [];
    this.performanceThreshold = 50; // 50ms requirement
  }

  /**
   * Run comprehensive encryption performance tests
   */
  async runPerformanceTests() {
    logger.info('Starting encryption performance tests...');

    const testResults = {
      timestamp: new Date().toISOString(),
      threshold: this.performanceThreshold,
      tests: {},
    };

    // Test key pair generation performance
    testResults.tests.keyGeneration = await this.testKeyGeneration();

    // Test message encryption performance
    testResults.tests.messageEncryption = await this.testMessageEncryption();

    // Test message decryption performance
    testResults.tests.messageDecryption = await this.testMessageDecryption();

    // Test group message encryption performance
    testResults.tests.groupEncryption = await this.testGroupMessageEncryption();

    // Test group message decryption performance
    testResults.tests.groupDecryption = await this.testGroupMessageDecryption();

    // Calculate overall performance score
    testResults.overall = this.calculateOverallScore(testResults.tests);

    // Log results
    this.logPerformanceResults(testResults);

    return testResults;
  }

  /**
   * Test key pair generation performance
   */
  async testKeyGeneration() {
    const iterations = 100;
    // const testMessage = 'test message for encryption';

    logger.info(`Testing key generation performance (${iterations} iterations)...`);

    const times = [];
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      // Generate key pair
      const keyPair = encryptionService.generateKeyPair();

      // Encrypt private key
      const testPassword = 'testPassword123!';
      const encryptedPrivateKey = encryptionService.encryptPrivateKey(
        keyPair.privateKey,
        testPassword
      );

      // Decrypt private key
      // const decryptedPrivateKey = encryptionService.decryptPrivateKey(
        encryptedPrivateKey,
        testPassword
      );

      const endTime = performance.now();
      const iterationTime = endTime - startTime;
      times.push(iterationTime);
      totalTime += iterationTime;
    }

    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const p95Time = this.calculatePercentile(times, 95);

    const result = {
      iterations,
      averageTime: Math.round(averageTime * 100) / 100,
      minTime: Math.round(minTime * 100) / 100,
      maxTime: Math.round(maxTime * 100) / 100,
      p95Time: Math.round(p95Time * 100) / 100,
      withinThreshold: p95Time < this.performanceThreshold,
      status: p95Time < this.performanceThreshold ? 'PASS' : 'FAIL',
    };

    logger.info(`Key generation test completed: ${result.status} (P95: ${result.p95Time}ms)`);
    return result;
  }

  /**
   * Test message encryption performance
   */
  async testMessageEncryption() {
    const iterations = 1000;
    const messageSizes = ['small', 'medium', 'large'];
    const results = {};

    for (const size of messageSizes) {
      const message = this.generateTestMessage(size);
      logger.info(`Testing ${size} message encryption (${iterations} iterations)...`);

      const times = [];
      let totalTime = 0;

      // Generate key pairs for testing
      const senderKeyPair = encryptionService.generateKeyPair();
      const recipientKeyPair = encryptionService.generateKeyPair();

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

      // const encryptionResult = encryptionService.encryptMessage(
          message,
          recipientKeyPair.publicKey,
          senderKeyPair.privateKey
        );

        const endTime = performance.now();
        const iterationTime = endTime - startTime;
        times.push(iterationTime);
        totalTime += iterationTime;
      }

      const averageTime = totalTime / iterations;
      const p95Time = this.calculatePercentile(times, 95);

      results[size] = {
        messageSize: message.length,
        iterations,
        averageTime: Math.round(averageTime * 100) / 100,
        p95Time: Math.round(p95Time * 100) / 100,
        withinThreshold: p95Time < this.performanceThreshold,
        status: p95Time < this.performanceThreshold ? 'PASS' : 'FAIL',
      };

      logger.info(
        `${size} message encryption: ${results[size].status} (P95: ${results[size].p95Time}ms)`
      );
    }

    return results;
  }

  /**
   * Test message decryption performance
   */
  async testMessageDecryption() {
    const iterations = 1000;
    const messageSizes = ['small', 'medium', 'large'];
    const results = {};

    for (const size of messageSizes) {
      const message = this.generateTestMessage(size);
      logger.info(`Testing ${size} message decryption (${iterations} iterations)...`);

      const times = [];
      let totalTime = 0;

      // Generate key pairs and encrypt a message first
      const senderKeyPair = encryptionService.generateKeyPair();
      const recipientKeyPair = encryptionService.generateKeyPair();

      const encryptionResult = encryptionService.encryptMessage(
        message,
        recipientKeyPair.publicKey,
        senderKeyPair.privateKey
      );

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        // const decryptedMessage = encryptionService.decryptMessage(
          encryptionResult.encryptedMessage,
          encryptionResult.nonce,
          senderKeyPair.publicKey,
          recipientKeyPair.privateKey
        );

        const endTime = performance.now();
        const iterationTime = endTime - startTime;
        times.push(iterationTime);
        totalTime += iterationTime;
      }

      const averageTime = totalTime / iterations;
      const p95Time = this.calculatePercentile(times, 95);

      results[size] = {
        messageSize: message.length,
        iterations,
        averageTime: Math.round(averageTime * 100) / 100,
        p95Time: Math.round(p95Time * 100) / 100,
        withinThreshold: p95Time < this.performanceThreshold,
        status: p95Time < this.performanceThreshold ? 'PASS' : 'FAIL',
      };

      logger.info(
        `${size} message decryption: ${results[size].status} (P95: ${results[size].p95Time}ms)`
      );
    }

    return results;
  }

  /**
   * Test group message encryption performance
   */
  async testGroupMessageEncryption() {
    const iterations = 1000;
    const messageSizes = ['small', 'medium', 'large'];
    const results = {};

    for (const size of messageSizes) {
      const message = this.generateTestMessage(size);
      logger.info(`Testing ${size} group message encryption (${iterations} iterations)...`);

      const times = [];
      let totalTime = 0;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        const encryptionResult = encryptionService.encryptGroupMessage(message);

        const endTime = performance.now();
        const iterationTime = endTime - startTime;
        times.push(iterationTime);
        totalTime += iterationTime;
      }

      const averageTime = totalTime / iterations;
      const p95Time = this.calculatePercentile(times, 95);

      results[size] = {
        messageSize: message.length,
        iterations,
        averageTime: Math.round(averageTime * 100) / 100,
        p95Time: Math.round(p95Time * 100) / 100,
        withinThreshold: p95Time < this.performanceThreshold,
        status: p95Time < this.performanceThreshold ? 'PASS' : 'FAIL',
      };

      logger.info(
        `${size} group encryption: ${results[size].status} (P95: ${results[size].p95Time}ms)`
      );
    }

    return results;
  }

  /**
   * Test group message decryption performance
   */
  async testGroupMessageDecryption() {
    const iterations = 1000;
    const messageSizes = ['small', 'medium', 'large'];
    const results = {};

    for (const size of messageSizes) {
      const message = this.generateTestMessage(size);
      logger.info(`Testing ${size} group message decryption (${iterations} iterations)...`);

      const times = [];
      let totalTime = 0;

      // Encrypt a message first
      const encryptionResult = encryptionService.encryptGroupMessage(message);

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        const decryptedMessage = encryptionService.decryptGroupMessage(
          encryptionResult.encryptedMessage,
          encryptionResult.nonce,
          encryptionResult.authTag
        );

        const endTime = performance.now();
        const iterationTime = endTime - startTime;
        times.push(iterationTime);
        totalTime += iterationTime;
      }

      const averageTime = totalTime / iterations;
      const p95Time = this.calculatePercentile(times, 95);

      results[size] = {
        messageSize: message.length,
        iterations,
        averageTime: Math.round(averageTime * 100) / 100,
        p95Time: Math.round(p95Time * 100) / 100,
        withinThreshold: p95Time < this.performanceThreshold,
        status: p95Time < this.performanceThreshold ? 'PASS' : 'FAIL',
      };

      logger.info(
        `${size} group decryption: ${results[size].status} (P95: ${results[size].p95Time}ms)`
      );
    }

    return results;
  }

  /**
   * Generate test message of specified size
   */
  generateTestMessage(size) {
    const baseMessage = 'This is a test message for encryption performance testing. ';
    let message = '';

    switch (size) {
      case 'small':
        message = baseMessage.repeat(1);
        break;
      case 'medium':
        message = baseMessage.repeat(10);
        break;
      case 'large':
        message = baseMessage.repeat(100);
        break;
      default:
        message = baseMessage;
    }

    return message;
  }

  /**
   * Calculate percentile from array of values
   */
  calculatePercentile(values, percentile) {
    const sortedValues = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower];
    }

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallScore(tests) {
    const allResults = [];

    // Collect all p95 times
    allResults.push(tests.keyGeneration.p95Time);
    allResults.push(tests.messageEncryption.small.p95Time);
    allResults.push(tests.messageEncryption.medium.p95Time);
    allResults.push(tests.messageEncryption.large.p95Time);
    allResults.push(tests.messageDecryption.small.p95Time);
    allResults.push(tests.messageDecryption.medium.p95Time);
    allResults.push(tests.messageDecryption.large.p95Time);
    allResults.push(tests.groupEncryption.small.p95Time);
    allResults.push(tests.groupEncryption.medium.p95Time);
    allResults.push(tests.groupEncryption.large.p95Time);
    allResults.push(tests.groupDecryption.small.p95Time);
    allResults.push(tests.groupDecryption.medium.p95Time);
    allResults.push(tests.groupDecryption.large.p95Time);

    const maxP95 = Math.max(...allResults);
    const avgP95 = allResults.reduce((sum, val) => sum + val, 0) / allResults.length;

    return {
      maxP95Time: Math.round(maxP95 * 100) / 100,
      avgP95Time: Math.round(avgP95 * 100) / 100,
      withinThreshold: maxP95 < this.performanceThreshold,
      overallStatus: maxP95 < this.performanceThreshold ? 'PASS' : 'FAIL',
    };
  }

  /**
   * Log performance test results
   */
  logPerformanceResults(results) {
    logger.info('=== Encryption Performance Test Results ===');
    logger.info(`Threshold: ${results.threshold}ms P95`);
    logger.info(`Overall Status: ${results.overall.overallStatus}`);
    logger.info(`Max P95 Time: ${results.overall.maxP95Time}ms`);
    logger.info(`Average P95 Time: ${results.overall.avgP95Time}ms`);

    Object.keys(results.tests).forEach(testName => {
      const test = results.tests[testName];
      logger.info(`\n${testName.toUpperCase()}:`);

      if (typeof test === 'object' && !test.iterations) {
        // Multiple sub-tests (like message sizes)
        Object.keys(test).forEach(subTest => {
          const subResult = test[subTest];
          logger.info(`  ${subTest}: ${subResult.status} (P95: ${subResult.p95Time}ms)`);
        });
      } else {
        logger.info(`  Status: ${test.status} (P95: ${test.p95Time}ms)`);
      }
    });

    if (results.overall.overallStatus === 'FAIL') {
      logger.error(
        `PERFORMANCE REQUIREMENT NOT MET: Max P95 time ${results.overall.maxP95Time}ms exceeds threshold ${results.threshold}ms`
      );
    } else {
      logger.info(
        `PERFORMANCE REQUIREMENT MET: All operations within ${results.threshold}ms P95 threshold`
      );
    }
  }

  /**
   * Run quick performance check (single iteration)
   */
  async quickPerformanceCheck() {
    logger.info('Running quick encryption performance check...');

    const quickResults = {
      timestamp: new Date().toISOString(),
      threshold: this.performanceThreshold,
      checks: {},
    };

    // Quick key generation check
    const keyGenStart = performance.now();
    const keyPair = encryptionService.generateKeyPair();
    const encryptedKey = encryptionService.encryptPrivateKey(keyPair.privateKey, 'testPassword');
    // const decryptedKey = encryptionService.decryptPrivateKey(encryptedKey, 'testPassword');
    const keyGenTime = performance.now() - keyGenStart;

    quickResults.checks.keyGeneration = {
      time: Math.round(keyGenTime * 100) / 100,
      withinThreshold: keyGenTime < this.performanceThreshold,
      status: keyGenTime < this.performanceThreshold ? 'PASS' : 'FAIL',
    };

    // Quick message encryption/decryption check
    const message = 'Quick performance test message';
    const senderKeyPair = encryptionService.generateKeyPair();
    const recipientKeyPair = encryptionService.generateKeyPair();

    const encryptStart = performance.now();
    const encryptionResult = encryptionService.encryptMessage(
      message,
      recipientKeyPair.publicKey,
      senderKeyPair.privateKey
    );
    const encryptTime = performance.now() - encryptStart;

    const decryptStart = performance.now();
    const decryptedMessage = encryptionService.decryptMessage(
      encryptionResult.encryptedMessage,
      encryptionResult.nonce,
      senderKeyPair.publicKey,
      recipientKeyPair.privateKey
    );
    const decryptTime = performance.now() - decryptStart;

    quickResults.checks.messageEncryption = {
      time: Math.round(encryptTime * 100) / 100,
      withinThreshold: encryptTime < this.performanceThreshold,
      status: encryptTime < this.performanceThreshold ? 'PASS' : 'FAIL',
    };

    quickResults.checks.messageDecryption = {
      time: Math.round(decryptTime * 100) / 100,
      withinThreshold: decryptTime < this.performanceThreshold,
      status: decryptTime < this.performanceThreshold ? 'PASS' : 'FAIL',
    };

    // Quick group message check
    const groupEncryptStart = performance.now();
    const groupEncryptionResult = encryptionService.encryptGroupMessage(message);
    const groupEncryptTime = performance.now() - groupEncryptStart;

    const groupDecryptStart = performance.now();
          // const groupDecryptedMessage = encryptionService.decryptGroupMessage(      groupEncryptionResult.encryptedMessage,
      groupEncryptionResult.nonce,
      groupEncryptionResult.authTag
    );
    const groupDecryptTime = performance.now() - groupDecryptStart;

    quickResults.checks.groupEncryption = {
      time: Math.round(groupEncryptTime * 100) / 100,
      withinThreshold: groupEncryptTime < this.performanceThreshold,
      status: groupEncryptTime < this.performanceThreshold ? 'PASS' : 'FAIL',
    };

    quickResults.checks.groupDecryption = {
      time: Math.round(groupDecryptTime * 100) / 100,
      withinThreshold: groupDecryptTime < this.performanceThreshold,
      status: groupDecryptTime < this.performanceThreshold ? 'PASS' : 'FAIL',
    };

    // Calculate quick overall score
    const allTimes = [
      quickResults.checks.keyGeneration.time,
      quickResults.checks.messageEncryption.time,
      quickResults.checks.messageDecryption.time,
      quickResults.checks.groupEncryption.time,
      quickResults.checks.groupDecryption.time,
    ];

    const maxTime = Math.max(...allTimes);

    quickResults.overall = {
      maxTime: Math.round(maxTime * 100) / 100,
      withinThreshold: maxTime < this.performanceThreshold,
      status: maxTime < this.performanceThreshold ? 'PASS' : 'FAIL',
    };

    logger.info(
      `Quick performance check: ${quickResults.overall.status} (Max time: ${quickResults.overall.maxTime}ms)`
    );

    return quickResults;
  }
}

export default new EncryptionPerformanceTest();
