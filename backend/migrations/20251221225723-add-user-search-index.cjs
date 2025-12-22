'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add GIN index for full-text search on users
    // Indexing the concatenation of username, firstName, lastName, and email
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_users_search_gin ON users USING GIN (
        to_tsvector('english',
          COALESCE("username", '') || ' ' ||
          COALESCE("first_name", '') || ' ' ||
          COALESCE("last_name", '') || ' ' ||
          COALESCE("email", '')
        )
      );
    `);

    // Add Trigram index for fuzzy matching (ILIKE) on username
    // This speeds up LIKE '%term%' queries
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_users_username_trgm ON users USING GIN ("username" gin_trgm_ops);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_users_search_gin;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_users_username_trgm;');
  }
};