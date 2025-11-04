'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'call' to the message_type enum
    await queryInterface.sequelize.query(
      "ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'call';"
    );
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL does not support removing enum values directly
    // You would need to recreate the enum type without 'call' and update the column
    // This is complex and risky, so we're leaving it as a no-op for now
    console.log('Rollback not supported for enum value addition');
  }
};
