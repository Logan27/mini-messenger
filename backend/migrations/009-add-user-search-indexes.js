'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  // Enable pg_trgm extension if not already enabled
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

  // Create a concatenated text search vector for full-text search
  await queryInterface.sequelize.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_text
    ON users
    USING GIN (
      to_tsvector('english',
        COALESCE(username, '') || ' ' ||
        COALESCE("first_name", '') || ' ' ||
        COALESCE("last_name", '') || ' ' ||
        COALESCE(email, '')
      )
    );
  `);

  // Create trigram index for fuzzy matching with SIMILARITY function
  await queryInterface.sequelize.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_trgm
    ON users
    USING GIN (
      (username || ' ' || COALESCE("first_name", '') || ' ' || COALESCE("last_name", '') || ' ' || email) gin_trgm_ops
    );
  `);

  // Create composite index for search filtering and ordering
  await queryInterface.addIndex('users',
    ['approval_status', 'id'],
    {
      name: 'idx_users_search_filter',
      where: {
        approval_status: 'approved',
      }
    }
  );
}

export async function down(queryInterface, Sequelize) {
  // Drop indexes
  await queryInterface.sequelize.query('DROP INDEX CONCURRENTLY IF EXISTS idx_users_search_text;');
  await queryInterface.sequelize.query('DROP INDEX CONCURRENTLY IF EXISTS idx_users_search_trgm;');
  await queryInterface.removeIndex('users', 'idx_users_search_filter');
}