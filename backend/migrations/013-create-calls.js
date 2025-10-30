'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calls', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      callerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      recipientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      callType: {
        type: Sequelize.ENUM('audio', 'video'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('calling', 'connected', 'ended', 'rejected', 'missed'),
        allowNull: false,
      },
      duration: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      startedAt: {
        type: Sequelize.DATE,
      },
      endedAt: {
        type: Sequelize.DATE,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('calls', ['callerId', 'createdAt']);
    await queryInterface.addIndex('calls', ['recipientId', 'createdAt']);
    await queryInterface.addIndex('calls', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('calls');
  },
};