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
      caller_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      recipient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      call_type: {
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
      started_at: {
        type: Sequelize.DATE,
      },
      ended_at: {
        type: Sequelize.DATE,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('calls', ['caller_id', 'created_at']);
    await queryInterface.addIndex('calls', ['recipient_id', 'created_at']);
    await queryInterface.addIndex('calls', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('calls');
  },
};