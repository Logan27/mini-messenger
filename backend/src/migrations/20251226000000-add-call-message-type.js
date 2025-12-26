'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface) {
    // Add 'call' to message_type enum
    await queryInterface.sequelize.query(`
      ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'call';
    `);
  },

  async down() {
    // PostgreSQL doesn't support removing enum values directly
    // This would require recreating the type which is complex and risky
    console.log('Cannot remove enum value - manual intervention required if needed');
  },
};
