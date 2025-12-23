'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('notifications', 'sender_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    
    await queryInterface.addIndex('notifications', ['sender_id'], {
      name: 'idx_notifications_sender_id',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('notifications', 'sender_id');
  },
};
