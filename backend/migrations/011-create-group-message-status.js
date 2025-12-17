'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('group_message_status', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    message_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    status: {
      type: Sequelize.ENUM('sent', 'delivered', 'read'),
      defaultValue: 'sent',
      allowNull: false,
    },
    delivered_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    read_at: {
      type: Sequelize.DATE,
      allowNull: true,
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

  // Add indexes for better performance
  await queryInterface.addIndex('group_message_status', ['message_id'], {
    name: 'idx_group_message_status_message',
  });

  await queryInterface.addIndex('group_message_status', ['user_id'], {
    name: 'idx_group_message_status_user',
  });

  await queryInterface.addIndex('group_message_status', ['message_id', 'user_id'], {
    name: 'idx_group_message_status_unique',
    unique: true,
  });

  await queryInterface.addIndex('group_message_status', ['status'], {
    name: 'idx_group_message_status_status',
  });

  await queryInterface.addIndex('group_message_status', ['delivered_at'], {
    name: 'idx_group_message_status_delivered',
  });

  await queryInterface.addIndex('group_message_status', ['read_at'], {
    name: 'idx_group_message_status_read',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('group_message_status');

  // Drop the ENUM type
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_group_message_status_status";');
}