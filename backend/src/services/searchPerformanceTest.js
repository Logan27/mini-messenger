import { Op } from 'sequelize';

import { User, Contact, sequelize } from './models/index.js';

/**
 * Performance test service for user search functionality
 * Tests search performance and validates <50ms requirement
 */
class SearchPerformanceTest {
  constructor() {
    this.testResults = [];
  }

  /**
   * Test search performance with various search terms
   */
  async runPerformanceTests() {
    console.log('🚀 Starting user search performance tests...');

    const testCases = [
      { searchTerm: 'a', description: 'Single character search' },
      { searchTerm: 'test', description: 'Common word search' },
      { searchTerm: 'user', description: 'Username search' },
      { searchTerm: 'gmail', description: 'Email domain search' },
      { searchTerm: 'john doe', description: 'Multi-word search' },
      { searchTerm: 'xyzxyzxyz', description: 'Non-existent term' },
    ];

    for (const testCase of testCases) {
      await this.testSearchPerformance(testCase);
    }

    this.printResults();
  }

  /**
   * Test individual search performance
   */
  async testSearchPerformance({ searchTerm, description }) {
    try {
      const startTime = performance.now();

      // Simulate the search query from the users route
      const { rows: users, count: totalUsers } = await User.findAndCountAll({
        where: {
          [Op.and]: [
            sequelize.literal(`
              (
                to_tsvector('english',
                  COALESCE(username, '') || ' ' ||
                  COALESCE(firstName, '') || ' ' ||
                  COALESCE(lastName, '') || ' ' ||
                  COALESCE(email, '')
                ) @@
                plainto_tsquery('english', :searchTerm)
                OR
                (username || ' ' || COALESCE(firstName, '') || ' ' || COALESCE(lastName, '') || ' ' || email) % :searchTerm
              )
            `),
            { id: { [Op.ne]: 'test-user-id' } }, // Mock user ID
            { id: { [Op.notIn]: [] } }, // No blocked users for test
            { approvalStatus: 'approved' },
          ],
        },
        attributes: {
          exclude: [
            'passwordHash',
            'emailVerificationToken',
            'passwordResetToken',
            'passwordResetExpires',
            'failedLoginAttempts',
            'lockedUntil',
            'rejectionReason',
          ],
        },
        replacements: { searchTerm },
        limit: 20,
        offset: 0,
        order: [
          [
            sequelize.literal(`
            (
              GREATEST(
                SIMILARITY(COALESCE(username, ''), :searchTerm),
                SIMILARITY(COALESCE(firstName, ''), :searchTerm),
                SIMILARITY(COALESCE(lastName, ''), :searchTerm),
                SIMILARITY(COALESCE(email, ''), :searchTerm)
              ) * 0.4 +
              ts_rank(
                to_tsvector('english',
                  COALESCE(username, '') || ' ' ||
                  COALESCE(firstName, '') || ' ' ||
                  COALESCE(lastName, '') || ' ' ||
                  COALESCE(email, '')
                ),
                plainto_tsquery('english', :searchTerm)
              ) * 0.6
            )
          `),
            'DESC',
          ],
          ['createdAt', 'DESC'],
        ],
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.testResults.push({
        description,
        searchTerm,
        responseTime: Math.round(responseTime * 100) / 100,
        resultCount: users.length,
        totalResults: totalUsers,
        success: responseTime < 50,
      });

      console.log(`✅ ${description}: ${responseTime}ms (${users.length} results)`);
    } catch (error) {
      console.error(`❌ ${description}: ${error.message}`);
      this.testResults.push({
        description,
        searchTerm,
        responseTime: -1,
        resultCount: 0,
        totalResults: 0,
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📊 Search Performance Test Results:');
    console.log('=====================================');

    const successfulTests = this.testResults.filter(test => test.success);
    const failedTests = this.testResults.filter(test => !test.success);

    console.log(`✅ Passed: ${successfulTests.length}/${this.testResults.length}`);
    console.log(`❌ Failed: ${failedTests.length}/${this.testResults.length}`);

    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.description}: ${test.responseTime}ms`);
        if (test.error) {
          console.log(`    Error: ${test.error}`);
        }
      });
    }

    const avgResponseTime =
      this.testResults
        .filter(test => test.responseTime > 0)
        .reduce((sum, test) => sum + test.responseTime, 0) / this.testResults.length;

    console.log(`\n📈 Average Response Time: ${Math.round(avgResponseTime * 100) / 100}ms`);
    console.log(`🎯 Target (<50ms): ${avgResponseTime < 50 ? '✅ MET' : '❌ NOT MET'}`);

    // Check if GIN indexes exist
    this.checkIndexes();
  }

  /**
   * Check if required indexes exist
   */
  async checkIndexes() {
    try {
      console.log('\n🔍 Checking GIN indexes...');

      const [indexResults] = await sequelize.query(`
        SELECT
          indexname,
          tablename,
          indexdef
        FROM pg_indexes
        WHERE tablename = 'users'
        AND indexdef LIKE '%GIN%'
        ORDER BY indexname;
      `);

      if (indexResults.length > 0) {
        console.log('✅ GIN indexes found:');
        indexResults.forEach(index => {
          console.log(`  - ${index.indexname}: ${index.indexdef.substring(0, 100)}...`);
        });
      } else {
        console.log('⚠️  No GIN indexes found. Migration may need to be run.');
      }

      // Check pg_trgm extension
      const [extensionResults] = await sequelize.query(`
        SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
      `);

      if (extensionResults.length > 0) {
        console.log('✅ pg_trgm extension is enabled');
      } else {
        console.log('⚠️  pg_trgm extension not found. Migration may need to be run.');
      }
    } catch (error) {
      console.error('❌ Error checking indexes:', error.message);
    }
  }
}

// Export for use in other files
export default SearchPerformanceTest;

// If run directly, execute tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new SearchPerformanceTest();
  test
    .runPerformanceTests()
    .then(() => {
      console.log('\n🎉 Performance testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    });
}
