'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'reactions', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Message reactions: { "👍": ["userId1", "userId2"], "❤️": ["userId3"] }',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'reactions');
  },
};
